import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Switch,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, NavigationProp, useRoute } from '@react-navigation/native';
import {
  Bell,
  RefreshCw,
  Calendar,
  Home,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Edit2,
  CreditCard,
  Mail,
  Trash2,
  AlertTriangle,
  Frown,
  DollarSign,
  Layers,
  Settings
} from 'lucide-react-native';
import * as adminService from '../../services/adminService';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import AppText from '../../components/common/AppText';
import LinearGradient from 'react-native-linear-gradient';
import AvatarBubble from '../../components/common/AvatarBubble';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { formatErrorMessage } from '../../utils/helpers';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';

// Types
interface School {
  id: string;
  school_id: string;
  name: string;
  email: string;
  address: string;
  status: 'active' | 'inactive';
  current_plan_name?: string;
  subscription_status?: string;
  trial_end_at?: string;
  subscription_end_at?: string;
  last_payment_amount?: number;
  last_payment_at?: string;
  enable_manual_attendance?: boolean;
  enable_photo_attendance?: boolean;
  enable_video_attendance?: boolean;
  aadhaar_verification_required?: boolean;
  reports?: 'basic' | 'advanced';
  save_attendance_media?: boolean;
  enable_storage_timeline?: boolean;
  media_retention_timeline?: 'daily' | 'weekly' | 'monthly';
  custom_max_branches?: number | null;
  director_name?: string;
}

interface Stats {
  total_schools: number;
  active_paid: number;
  trial_active: number;
  payment_due: number;
  inactive: number;
  revenue_this_month: number;
}

interface Subscription {
  current_plan_name: string;
  subscription_status: string;
  access_enabled: boolean;
  trial_end_at?: string;
  subscription_end_at?: string;
  last_payment_amount?: number;
  last_payment_at?: string;
}

interface Payment {
  id: string;
  amount: number;
  plan_name: string;
  payment_method: string;
  status: string;
  paid_at: string;
  razorpay_payment_id?: string;
}

// Helper functions
const getUserRole = async (): Promise<string> => {
  return (await AsyncStorage.getItem('userRole')) || '';
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getDaysLeft = (endDate: string | null): number | null => {
  if (!endDate) return null;
  const end = new Date(endDate);
  const today = new Date();
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getDaysLeftColor = (days: number | null): string => {
  if (days === null) return colors.textMuted;
  if (days < 0) return colors.error;
  if (days <= 3) return colors.warning;
  return colors.success;
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string; type?: 'school' | 'subscription' }> = ({ 
  status, 
  type = 'school' 
}) => {
  if (type === 'school') {
    const isActive = status?.toLowerCase() === 'active';
    return (
      <View style={[styles.statusBadge, isActive ? { backgroundColor: colors.successSoft } : { backgroundColor: colors.errorSoft }]}>
        <View style={[styles.statusDot, { backgroundColor: isActive ? colors.success : colors.error }]} />
        <AppText style={[styles.statusText, { color: isActive ? colors.success : colors.error }]}>
          {isActive ? 'Active' : 'Inactive'}
        </AppText>
      </View>
    );
  }

  // Subscription status
  const getStatusConfig = () => {
    const s = status?.toLowerCase() || '';
    if (s === 'active_paid') return { color: colors.success, bg: colors.successSoft, label: 'Active Paid' };
    if (s === 'trial_active') return { color: colors.primary, bg: 'rgba(99, 102, 241, 0.1)', label: 'Trial Active' };
    if (s === 'payment_due') return { color: colors.warning, bg: colors.warningSoft, label: 'Payment Due' };
    return { color: colors.error, bg: colors.errorSoft, label: status || 'Unknown' };
  };
  const config = getStatusConfig();
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <AppText style={[styles.statusText, { color: config.color }]}>{config.label}</AppText>
    </View>
  );
};

// School Card Component
const SchoolCard: React.FC<{
  school: School;
  onEdit: (school: School) => void;
  onSubscription: (school: School) => void;
  onResendCredentials: (school: School) => void;
  onSendReminder: (school: School) => void;
}> = ({ school, onEdit, onSubscription, onResendCredentials, onSendReminder }) => {
  const daysLeft = getDaysLeft(school.trial_end_at || school.subscription_end_at || null);
  const daysLeftColor = getDaysLeftColor(daysLeft);
  const isExpiringSoon = daysLeft !== null && daysLeft <= 3 && daysLeft > 0;

  return (
    <AppCard style={styles.schoolCard}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.schoolId}>{school.school_id}</AppText>
          <AppText style={styles.schoolName}>{school.name}</AppText>
        </View>
        <StatusBadge status={school.status} type="school" />
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Email:</AppText>
          <AppText style={styles.detailValue}>{school.email}</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Plan:</AppText>
          <AppText style={styles.detailValue}>{school.current_plan_name || 'Basic Attendance'}</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Status:</AppText>
          <StatusBadge status={school.subscription_status || ''} type="subscription" />
        </View>
        {!!school.trial_end_at && (
          <View style={styles.detailRow}>
            <AppText style={styles.detailLabel}>Trial End:</AppText>
            <AppText style={[styles.detailValue, { color: daysLeftColor }]}>
              {formatDate(school.trial_end_at)}
              {daysLeft !== null && (
                <AppText style={{ fontSize: 11 }}> ({daysLeft < 0 ? 'Expired' : `${daysLeft} days left`})</AppText>
              )}
            </AppText>
          </View>
        )}
        {!!school.last_payment_amount && (
          <View style={styles.detailRow}>
            <AppText style={styles.detailLabel}>Last Payment:</AppText>
            <AppText style={styles.detailValue}>₹{school.last_payment_amount}</AppText>
          </View>
        )}
      </View>

      {isExpiringSoon && (
        <View style={styles.warningBanner}>
          <AlertTriangle size={14} color={colors.warning} />
          <AppText style={styles.warningText}>Trial ending in {daysLeft} days!</AppText>
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(school)}>
          <Edit2 size={12} color={colors.textMuted} />
          <AppText style={styles.actionBtnText}>Edit</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onSubscription(school)}>
          <CreditCard size={12} color={colors.textMuted} />
          <AppText style={styles.actionBtnText}>Payments</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onResendCredentials(school)}>
          <Mail size={12} color={colors.textMuted} />
          <AppText style={styles.actionBtnText}>Resend</AppText>
        </TouchableOpacity>
      </View>
    </AppCard>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: any;
  color: string;
  loading?: boolean;
}> = ({ title, value, icon: Icon, color, loading }) => {
  const bgAccent = color + '15';
  return (
    <View style={styles.statCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: bgAccent, justifyContent: 'center', alignItems: 'center' }}>
          <Icon size={16} color={color} />
        </View>
        <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: color }} />
      </View>
      {loading ? (
        <View style={styles.skeletonValue} />
      ) : (
        <AppText style={styles.statValue}>{value}</AppText>
      )}
      <AppText style={styles.statTitle}>{title}</AppText>
    </View>
  );
};

// Inline Selector Component
const InlineSelector: React.FC<{
  options: { label: string; value: any }[];
  selectedValue: any;
  onSelect: (val: any) => void;
  disabled?: boolean;
}> = ({ options, selectedValue, onSelect, disabled }) => (
  <View style={[styles.inlineSelector, disabled && { opacity: 0.5 }]}>
    {options.map(opt => {
      const active = opt.value === selectedValue;
      return (
        <TouchableOpacity
          key={String(opt.value)}
          style={[styles.inlineSelectorOption, active && styles.inlineSelectorOptionActive]}
          onPress={() => !disabled && onSelect(opt.value)}
          disabled={disabled}
        >
          <AppText style={[styles.inlineSelectorText, active && styles.inlineSelectorTextActive]}>
            {opt.label}
          </AppText>
        </TouchableOpacity>
      );
    })}
  </View>
);

// School Form Modal
const SchoolFormModal: React.FC<{
  visible: boolean;
  mode: 'create' | 'edit';
  initialData?: School | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ visible, mode, initialData, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'features' | 'limits'>('general');
  const [loadingSub, setLoadingSub] = useState(false);
  const [formData, setFormData] = useState({
    school_id: '',
    name: '',
    email: '',
    address: '',
    status: 'active',
    director_name: '',
    subscription_status: '',
    extend_plan_days: '',
    extend_reason: '',
    extended_by_name: '',
    enable_manual_attendance: true,
    enable_photo_attendance: false,
    enable_video_attendance: false,
    aadhaar_verification_required: false,
    custom_max_branches: '',
    reports: 'basic',
    save_attendance_media: false,
    enable_storage_timeline: false,
    media_retention_timeline: 'weekly',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible && mode === 'edit' && initialData) {
      setFormData({
        school_id: initialData.school_id || '',
        name: initialData.name || '',
        email: initialData.email || '',
        address: initialData.address || '',
        status: initialData.status || 'active',
        director_name: initialData.director_name || '',
        subscription_status: initialData.subscription_status || 'trial_active',
        extend_plan_days: '',
        extend_reason: '',
        extended_by_name: '',
        enable_manual_attendance: initialData.enable_manual_attendance ?? false,
        enable_photo_attendance: initialData.enable_photo_attendance ?? false,
        enable_video_attendance: initialData.enable_video_attendance ?? false,
        aadhaar_verification_required: initialData.aadhaar_verification_required ?? false,
        custom_max_branches: initialData.custom_max_branches != null ? String(initialData.custom_max_branches) : '',
        reports: initialData.reports || 'basic',
        save_attendance_media: initialData.save_attendance_media ?? false,
        enable_storage_timeline: initialData.enable_storage_timeline ?? false,
        media_retention_timeline: initialData.media_retention_timeline || 'weekly',
      });
      setActiveTab('general');

      const loadSubDetails = async () => {
        setLoadingSub(true);
        try {
          const sub = await adminService.getSchoolSubscription(initialData.id);
          if (sub) {
            setFormData(prev => ({
              ...prev,
              subscription_status: sub.subscription_status || prev.subscription_status,
              custom_max_branches: sub.custom_max_branches != null ? String(sub.custom_max_branches) : prev.custom_max_branches,
            }));
          }
        } catch (e) {
          console.warn('Failed to load subscription details for school edit', e);
        } finally {
          setLoadingSub(false);
        }
      };
      loadSubDetails();
    } else if (visible && mode === 'create') {
      setFormData({
        school_id: '',
        name: '',
        email: '',
        address: '',
        status: 'active',
        director_name: '',
        subscription_status: 'trial_active',
        extend_plan_days: '',
        extend_reason: '',
        extended_by_name: '',
        enable_manual_attendance: true,
        enable_photo_attendance: false,
        enable_video_attendance: false,
        aadhaar_verification_required: false,
        custom_max_branches: '',
        reports: 'basic',
        save_attendance_media: false,
        enable_storage_timeline: false,
        media_retention_timeline: 'weekly',
      });
      setActiveTab('general');
    }
    setErrors({});
  }, [visible, mode, initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.school_id.trim()) newErrors.school_id = 'School ID is required';
    if (!formData.name.trim()) newErrors.name = 'School name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (mode === 'create') {
        await adminService.createSchool({
          school_id: formData.school_id,
          name: formData.name,
          email: formData.email,
          address: formData.address,
          status: formData.status,
          director_name: formData.director_name,
          enable_manual_attendance: formData.enable_manual_attendance,
          enable_photo_attendance: formData.enable_photo_attendance,
          enable_video_attendance: formData.enable_video_attendance,
          aadhaar_verification_required: formData.aadhaar_verification_required,
          reports: formData.reports,
          save_attendance_media: formData.save_attendance_media,
          enable_storage_timeline: formData.enable_storage_timeline,
          media_retention_timeline: formData.media_retention_timeline,
        });
        Alert.alert('Success', 'School registered successfully');
      } else {
        // 1. Update School details & capabilities
        await adminService.updateSchool(initialData?.id || '', {
          name: formData.name,
          director_name: formData.director_name,
          email: formData.email,
          address: formData.address,
          status: formData.status,
          enable_manual_attendance: formData.enable_manual_attendance,
          enable_photo_attendance: formData.enable_photo_attendance,
          enable_video_attendance: formData.enable_video_attendance,
          aadhaar_verification_required: formData.aadhaar_verification_required,
          reports: formData.reports,
          save_attendance_media: formData.save_attendance_media,
          enable_storage_timeline: formData.enable_storage_timeline,
          media_retention_timeline: formData.media_retention_timeline,
        });

        // 2. Update Subscription state & extensions
        const subPayload: any = {};
        if (formData.subscription_status) {
          subPayload.subscription_status = formData.subscription_status;
        }
        if (formData.extend_plan_days && parseInt(formData.extend_plan_days, 10) > 0) {
          subPayload.extend_plan_days = parseInt(formData.extend_plan_days, 10);
          subPayload.extend_reason = formData.extend_reason;
          subPayload.extended_by_name = formData.extended_by_name;
        }
        
        if (formData.custom_max_branches !== '') {
          const val = formData.custom_max_branches.trim();
          subPayload.custom_max_branches = (val === '∞' || val === '') ? null : parseInt(val, 10);
        } else {
          subPayload.custom_max_branches = null;
        }

        await adminService.updateSubscription(initialData?.id || '', subPayload);
        Alert.alert('Success', 'School and features updated successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail === 'School ID already exists') {
        setErrors({ school_id: 'This School ID is already taken' });
      } else if (detail === 'Email already exists') {
        setErrors({ email: 'This email is already registered' });
      } else {
        Alert.alert('Error', formatErrorMessage(detail) || 'Something went wrong');
      }
    } finally {
      setSaving(false);
    }
  };

  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' }
  ];

  const subStatusOptions = [
    { label: 'Active Paid', value: 'active_paid' },
    { label: 'Trial Active', value: 'trial_active' },
    { label: 'Payment Due', value: 'payment_due' },
    { label: 'Suspended', value: 'suspended' }
  ];

  const reportsOptions = [
    { label: 'Basic', value: 'basic' },
    { label: 'Advanced', value: 'advanced' }
  ];

  const timelineOptions = [
    { label: 'Daily (24h)', value: 'daily' },
    { label: 'Weekly (7d)', value: 'weekly' },
    { label: 'Monthly (30d)', value: 'monthly' }
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, mode === 'edit' && styles.modalContentLarge]}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.modalTitle}>
                {mode === 'create' ? 'Register New School' : 'Edit School & Features'}
              </AppText>
              {mode === 'edit' && (
                <AppText style={{ fontSize: 12, color: colors.textMuted }}>{formData.name}</AppText>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Modal Tabs */}
          <View style={styles.modalTabBar}>
              <TouchableOpacity
                style={[styles.modalTabBtn, activeTab === 'general' && styles.modalTabBtnActive]}
                onPress={() => setActiveTab('general')}
              >
                <AppText style={[styles.modalTabText, activeTab === 'general' && styles.modalTabTextActive]}>
                  General
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTabBtn, activeTab === 'features' && styles.modalTabBtnActive]}
                onPress={() => setActiveTab('features')}
              >
                <AppText style={[styles.modalTabText, activeTab === 'features' && styles.modalTabTextActive]}>
                  Features
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTabBtn, activeTab === 'limits' && styles.modalTabBtnActive]}
                onPress={() => setActiveTab('limits')}
              >
                <AppText style={[styles.modalTabText, activeTab === 'limits' && styles.modalTabTextActive]}>
                  Data & Limits
                </AppText>
              </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {loadingSub ? (
              <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={colors.accent} /></View>
            ) : (
              <View style={{ paddingBottom: 24 }}>
                {activeTab === 'general' && (
                  <View style={{ gap: 16 }}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={[styles.formGroup, { flex: 1 }]}>
                        <AppText style={styles.formLabel}>School ID</AppText>
                        <TextInput
                          style={[styles.formInput, mode === 'edit' && { backgroundColor: '#f8fafc', color: colors.accent, fontWeight: '700' }, errors.school_id && styles.formInputError]}
                          value={formData.school_id}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, school_id: text.toUpperCase() }))}
                          editable={mode === 'create'}
                          placeholder="e.g. SCH00123"
                        />
                        {errors.school_id && <AppText style={styles.formError}>{errors.school_id}</AppText>}
                      </View>
                      <View style={[styles.formGroup, { flex: 2 }]}>
                        <AppText style={styles.formLabel}>* School Name</AppText>
                        <TextInput
                          style={[styles.formInput, errors.name && styles.formInputError]}
                          value={formData.name}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                          placeholder="School Name"
                        />
                        {errors.name && <AppText style={styles.formError}>{errors.name}</AppText>}
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={[styles.formGroup, { flex: 1 }]}>
                        <AppText style={styles.formLabel}>Director Name</AppText>
                        <TextInput
                          style={styles.formInput}
                          value={formData.director_name}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, director_name: text }))}
                          placeholder="Full Name"
                        />
                      </View>
                      <View style={[styles.formGroup, { flex: 1 }]}>
                        <AppText style={styles.formLabel}>* Director Email</AppText>
                        <TextInput
                          style={[styles.formInput, errors.email && styles.formInputError]}
                          value={formData.email}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                          placeholder="visys1@gmail.com"
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                        {errors.email && <AppText style={styles.formError}>{errors.email}</AppText>}
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <AppText style={styles.formLabel}>* Address</AppText>
                      <TextInput
                        style={[styles.formInput, styles.textArea, errors.address && styles.formInputError]}
                        placeholder="Full address..."
                        placeholderTextColor={colors.textMuted}
                        multiline
                        numberOfLines={3}
                        value={formData.address}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
                      />
                      {errors.address && <AppText style={styles.formError}>{errors.address}</AppText>}
                    </View>

                    {/* Section: Subscription & Status */}
                    <View style={styles.sectionHeader}>
                      <Settings size={14} color={colors.accent} style={{ marginRight: 6 }} />
                      <AppText style={styles.sectionHeaderText}>Subscription & Status</AppText>
                    </View>

                    <View style={styles.formGroup}>
                      <AppText style={styles.formLabel}>System Status</AppText>
                      <InlineSelector
                        options={statusOptions}
                        selectedValue={formData.status}
                        onSelect={(val) => setFormData(prev => ({ ...prev, status: val }))}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <AppText style={styles.formLabel}>Subscription State</AppText>
                      <InlineSelector
                        options={subStatusOptions}
                        selectedValue={formData.subscription_status}
                        onSelect={(val) => setFormData(prev => ({ ...prev, subscription_status: val }))}
                      />
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={[styles.formGroup, { flex: 1 }]}>
                        <AppText style={styles.formLabel}>Extend Plan (Days)</AppText>
                        <TextInput
                          style={styles.formInput}
                          keyboardType="numeric"
                          placeholder="e.g. 15"
                          value={formData.extend_plan_days}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, extend_plan_days: text }))}
                        />
                      </View>
                      <View style={[styles.formGroup, { flex: 2 }]}>
                        <AppText style={styles.formLabel}>Reason for Extension</AppText>
                        <TextInput
                          style={styles.formInput}
                          placeholder="e.g. Setup delay"
                          value={formData.extend_reason}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, extend_reason: text }))}
                        />
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <AppText style={styles.formLabel}>Extended By (Name)</AppText>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Enter your name"
                        value={formData.extended_by_name}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, extended_by_name: text }))}
                      />
                    </View>
                  </View>
                )}

                {activeTab === 'features' && (
                  <View>
                    {/* Section: Attendance Capabilities */}
                    <View style={styles.sectionHeader}>
                      <Layers size={14} color={colors.accent} style={{ marginRight: 6 }} />
                      <AppText style={styles.sectionHeaderText}>Attendance Capabilities</AppText>
                    </View>

                    <View style={styles.featureCard}>
                      {[
                        { key: 'enable_manual_attendance', label: 'Manual Attendance', desc: 'Standard staff-marked attendance' },
                        { key: 'enable_photo_attendance', label: 'Photo Attendance', desc: 'Face recognition via snapshots' },
                        { key: 'enable_video_attendance', label: 'Video Attendance', desc: 'Live stream face tracking' },
                        { key: 'aadhaar_verification_required', label: 'Aadhaar OCR', desc: 'Extract data from identity cards' },
                      ].map(item => (
                        <View key={item.key} style={styles.featureRow}>
                          <View style={styles.featureTextContainer}>
                            <AppText style={styles.featureTitle}>{item.label}</AppText>
                            <AppText style={styles.featureDesc}>{item.desc}</AppText>
                          </View>
                          <Switch
                            value={(formData as any)[item.key]}
                            onValueChange={(val) => setFormData(prev => ({ ...prev, [item.key]: val }))}
                            trackColor={{ false: colors.border, true: colors.accent }}
                            thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                          />
                        </View>
                      ))}
                    </View>

                    {/* Section: Limits */}
                    <View style={styles.sectionHeader}>
                      <Layers size={14} color={colors.accent} style={{ marginRight: 6 }} />
                      <AppText style={styles.sectionHeaderText}>Limits</AppText>
                    </View>

                    <View style={styles.featureCard}>
                      <View style={styles.featureRow}>
                        <View style={styles.featureTextContainer}>
                          <AppText style={styles.featureTitle}>Max Branches</AppText>
                          <AppText style={styles.featureDesc}>Revert to plan default if empty</AppText>
                        </View>
                        <TextInput
                          style={[styles.formInput, { width: 100, padding: 8 }]}
                          placeholder="∞"
                          value={formData.custom_max_branches}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, custom_max_branches: text }))}
                          keyboardType="numeric"
                        />
                      </View>

                      <View style={[styles.featureRow, { borderTopWidth: 1, borderTopColor: '#eef2f6', paddingTop: 12, marginTop: 12 }]}>
                        <View style={styles.featureTextContainer}>
                          <AppText style={styles.featureTitle}>Reports Level</AppText>
                          <AppText style={styles.featureDesc}>Basic report exports or detailed insights</AppText>
                        </View>
                        <InlineSelector
                          options={reportsOptions}
                          selectedValue={formData.reports}
                          onSelect={(val) => setFormData(prev => ({ ...prev, reports: val }))}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {activeTab === 'limits' && (
                  <View>
                    {/* Section: Media Retention */}
                    <View style={styles.sectionHeader}>
                      <Layers size={14} color={colors.accent} style={{ marginRight: 6 }} />
                      <AppText style={styles.sectionHeaderText}>Media Retention</AppText>
                    </View>

                    <View style={styles.featureCard}>
                      <View style={styles.featureRow}>
                        <View style={styles.featureTextContainer}>
                          <AppText style={styles.featureTitle}>Save Media</AppText>
                          <AppText style={styles.featureDesc}>Store attendance verification evidence</AppText>
                        </View>
                        <Switch
                          value={formData.save_attendance_media}
                          onValueChange={(val) => setFormData(prev => ({ 
                            ...prev, 
                            save_attendance_media: val,
                            enable_storage_timeline: val ? prev.enable_storage_timeline : false
                          }))}
                          trackColor={{ false: colors.border, true: colors.accent }}
                          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                        />
                      </View>

                      <View style={[
                        styles.featureRow, 
                        { borderTopWidth: 1, borderTopColor: '#eef2f6', paddingTop: 12, marginTop: 12 },
                        !formData.save_attendance_media && { opacity: 0.5 }
                      ]}>
                        <View style={styles.featureTextContainer}>
                          <AppText style={styles.featureTitle}>Retention</AppText>
                          <AppText style={styles.featureDesc}>Enable auto-purging storage timeline</AppText>
                        </View>
                        <Switch
                          value={formData.enable_storage_timeline}
                          onValueChange={(val) => setFormData(prev => ({ ...prev, enable_storage_timeline: val }))}
                          disabled={!formData.save_attendance_media}
                          trackColor={{ false: colors.border, true: colors.accent }}
                          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                        />
                      </View>
                    </View>

                    {/* Retention Period Card */}
                    <View style={[
                      styles.retentionCard,
                      {
                        backgroundColor: (formData.save_attendance_media && formData.enable_storage_timeline) ? '#f5f3ff' : '#fff',
                        borderColor: (formData.save_attendance_media && formData.enable_storage_timeline) ? colors.accent : '#eef2f6',
                        opacity: (formData.save_attendance_media && formData.enable_storage_timeline) ? 1 : 0.6,
                      }
                    ]}>
                      <View style={styles.retentionHeader}>
                        <AppText style={styles.featureTitle}>Retention Timeline</AppText>
                        {(formData.save_attendance_media && formData.enable_storage_timeline) && (
                          <AppText style={styles.retentionBadge}>Active</AppText>
                        )}
                      </View>
                      
                      <AppText style={{ fontSize: 11, color: (formData.save_attendance_media && formData.enable_storage_timeline) ? '#475569' : '#94a3b8', marginBottom: 12 }}>
                        {(formData.save_attendance_media && formData.enable_storage_timeline)
                          ? 'Choose how long attendance media should be kept once Save Media is enabled.'
                          : 'Enable Save Media and Retention to choose the retention period for images and videos.'}
                      </AppText>

                      <InlineSelector
                        options={timelineOptions}
                        selectedValue={formData.media_retention_timeline}
                        onSelect={(val) => setFormData(prev => ({ ...prev, media_retention_timeline: val }))}
                        disabled={!formData.save_attendance_media || !formData.enable_storage_timeline}
                      />

                      <AppText style={{ fontSize: 11, color: (formData.save_attendance_media && formData.enable_storage_timeline) ? '#64748b' : '#94a3b8', marginTop: 12 }}>
                        Images/Videos will be permanently deleted after the selected period.
                      </AppText>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <View style={{ flex: 1 }}>
              <AppButton title="Cancel" onPress={onClose} type="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton title={saving ? 'Saving...' : 'Save All Changes'} onPress={handleSave} disabled={saving} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Subscription Modal
const SubscriptionModal: React.FC<{
  visible: boolean;
  school: School | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ visible, school, onClose, onSuccess }) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extendDays, setExtendDays] = useState('0');
  const [markPaid, setMarkPaid] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [activeTab, setActiveTab] = useState<'manage' | 'history'>('manage');

  useEffect(() => {
    if (visible && school) {
      fetchSubscription();
      fetchPayments();
    }
  }, [visible, school]);

  const fetchSubscription = async () => {
    if (!school) return;
    setLoading(true);
    try {
      const sub = await adminService.getSchoolSubscription(school.id);
      setSubscription(sub);
    } catch (err) {
      console.error('Failed to load subscription', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    if (!school) return;
    try {
      const paymentsList = await adminService.getSchoolPayments(school.id);
      setPayments(paymentsList);
    } catch (err) {
      console.error('Failed to load payments', err);
    }
  };

  const handleSave = async () => {
    if (!school) return;
    setSaving(true);
    try {
      const payload: any = {};
      if (parseInt(extendDays) > 0) payload.extend_trial_days = parseInt(extendDays);
      if (markPaid) {
        payload.mark_paid = true;
        payload.amount_paid = parseFloat(amountPaid) || 0;
        payload.payment_method = paymentMethod;
      }
      await adminService.updateSubscription(school.id, payload);
      Alert.alert('Success', 'Subscription updated successfully');
      await fetchSubscription();
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', formatErrorMessage(err?.response?.data?.detail) || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const daysLeft = subscription?.trial_end_at 
    ? getDaysLeft(subscription.trial_end_at) 
    : subscription?.subscription_end_at 
      ? getDaysLeft(subscription.subscription_end_at) 
      : null;

  const isExpiringSoon = daysLeft !== null && daysLeft <= 3 && daysLeft > 0;
  const isExpired = daysLeft !== null && daysLeft < 0;

  if (loading) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 40 }]}>
            <Loader />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, styles.subscriptionModal]}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.modalTitle}>Manage Subscription</AppText>
              <AppText style={{ fontSize: 12, color: colors.textMuted }}>{school?.name}</AppText>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Tab Buttons */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'manage' && styles.tabBtnActive]}
              onPress={() => setActiveTab('manage')}
            >
              <AppText style={[styles.tabText, activeTab === 'manage' && styles.tabTextActive]}>
                Manage
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
              onPress={() => setActiveTab('history')}
            >
              <AppText style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
                History
              </AppText>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {activeTab === 'manage' && subscription && (
              <>
                {isExpiringSoon && (
                  <View style={styles.warningBanner}>
                    <Icon name="alert-triangle" size={14} color={colors.warning} />
                    <AppText style={styles.warningText}>Trial ending in {daysLeft} days!</AppText>
                  </View>
                )}
                {isExpired && (
                  <View style={[styles.warningBanner, { backgroundColor: colors.errorSoft }]}>
                    <Icon name="alert-circle" size={14} color={colors.error} />
                    <AppText style={[styles.warningText, { color: colors.error }]}>Subscription expired! Access blocked.</AppText>
                  </View>
                )}

                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <AppText style={styles.infoLabel}>Current Plan</AppText>
                    <AppText style={styles.infoValue}>{subscription.current_plan_name || 'Basic Attendance'}</AppText>
                  </View>
                  <View style={styles.infoItem}>
                    <AppText style={styles.infoLabel}>Status</AppText>
                    <StatusBadge status={subscription.subscription_status || ''} type="subscription" />
                  </View>
                  {!!subscription.trial_end_at && (
                    <View style={styles.infoItem}>
                      <AppText style={styles.infoLabel}>Trial End Date</AppText>
                      <AppText style={styles.infoValue}>{formatDate(subscription.trial_end_at)}</AppText>
                    </View>
                  )}
                  <View style={styles.infoItem}>
                    <AppText style={styles.infoLabel}>Access Enabled</AppText>
                    <AppText style={[styles.infoValue, { color: subscription.access_enabled ? colors.success : colors.error }]}>
                      {subscription.access_enabled ? 'Yes' : 'No'}
                    </AppText>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <AppText style={styles.formLabel}>Extend trial (days)</AppText>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    value={extendDays}
                    onChangeText={setExtendDays}
                  />
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.switchRow}>
                    <AppText style={styles.switchLabel}>Mark as paid</AppText>
                    <Switch
                      value={markPaid}
                      onValueChange={setMarkPaid}
                      trackColor={{ false: colors.border, true: colors.accent }}
                      thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                    />
                  </View>
                </View>

                {markPaid && (
                  <>
                    <View style={styles.formGroup}>
                      <AppText style={styles.formLabel}>Amount paid (₹)</AppText>
                      <TextInput
                        style={styles.formInput}
                        keyboardType="numeric"
                        placeholder="Enter amount"
                        placeholderTextColor={colors.textMuted}
                        value={amountPaid}
                        onChangeText={setAmountPaid}
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <AppText style={styles.formLabel}>Payment method</AppText>
                      <View style={styles.pickerContainer}>
                        {['card', 'upi', 'netbanking', 'wallet'].map(method => (
                          <TouchableOpacity
                            key={method}
                            style={[styles.pickerOption, paymentMethod === method && styles.pickerOptionActive]}
                            onPress={() => setPaymentMethod(method)}
                          >
                            <AppText style={[styles.pickerText, paymentMethod === method && styles.pickerTextActive]}>
                              {method.charAt(0).toUpperCase() + method.slice(1)}
                            </AppText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </>
                )}
              </>
            )}

            {activeTab === 'history' && (
              payments.length === 0 ? (
                <View style={styles.emptyPayments}>
                  <DollarSign size={40} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 12 }} />
                  <AppText style={styles.emptyText}>No payment records found</AppText>
                </View>
              ) : (
                payments.map((payment, index) => (
                  <View key={payment.id || index} style={styles.paymentItem}>
                    <View style={styles.paymentHeader}>
                      <AppText style={styles.paymentDate}>{formatDate(payment.paid_at)}</AppText>
                      <View style={[styles.statusBadge, payment.status === 'paid' ? { backgroundColor: colors.successSoft } : { backgroundColor: colors.warningSoft }]}>
                        <AppText style={[styles.statusText, { color: payment.status === 'paid' ? colors.success : colors.warning }]}>
                          {payment.status}
                        </AppText>
                      </View>
                    </View>
                    <AppText style={styles.paymentAmount}>₹{payment.amount}</AppText>
                    <AppText style={styles.paymentPlan}>Plan: {payment.plan_name}</AppText>
                    <AppText style={styles.paymentMethod}>Method: {payment.payment_method}</AppText>
                    {!!payment.razorpay_payment_id && (
                      <AppText style={styles.paymentTxId}>TX: {payment.razorpay_payment_id}</AppText>
                    )}
                  </View>
                ))
              )
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <View style={{ flex: 1 }}>
              <AppButton title="Cancel" onPress={onClose} type="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton title={saving ? 'Saving...' : 'Save'} onPress={handleSave} disabled={saving} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Delete Confirmation Modal
const DeleteConfirmModal: React.FC<{
  visible: boolean;
  school: School | null;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}> = ({ visible, school, onConfirm, onCancel, deleting }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.deleteModal}>
        <View style={styles.deleteIconWrap}>
          <AlertTriangle size={28} color={colors.error} />
        </View>
        <AppText style={styles.deleteTitle}>Delete School?</AppText>
        <AppText style={styles.deleteMessage}>
          This action is permanent. The following school will be removed:
        </AppText>
        <View style={styles.deleteSchoolName}>
          <AppText style={styles.deleteSchoolNameText}>
            {school?.school_id} — {school?.name}
          </AppText>
        </View>
        <View style={styles.deleteActions}>
          <View style={{ flex: 1 }}>
            <AppButton title="Cancel" onPress={onCancel} type="secondary" />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton title={deleting ? '...' : 'Delete'} onPress={onConfirm} disabled={deleting} />
          </View>
        </View>
      </View>
    </View>
  </Modal>
);

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const { userName, setTabBarVisible, userRole, isTabBarVisible } = useAuth();
  const isAgent = userRole?.toLowerCase() === 'agent';
  const headerTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerTranslateY, {
      toValue: isTabBarVisible ? 0 : -200,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [isTabBarVisible]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const { unreadCount } = useUnreadNotifications();

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<School | null>(null);
  const [subscriptionSchool, setSubscriptionSchool] = useState<School | null>(null);
  const [deleting, setDeleting] = useState(false);

  const lastScrollY = useRef(0);

  const ITEMS_PER_PAGE = 8;

  // Fetch schools
  const fetchSchools = async (isRefresh = false) => {
    const role = await AsyncStorage.getItem('userRole') || 'admin';
    const cacheKey = `admin_schools_cache_${role}`;
    let cacheLoaded = false;

    if (!isRefresh) {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          setSchools(JSON.parse(cached));
          cacheLoaded = true;
        }
      } catch (e) {
        console.warn('Failed to load schools cache', e);
      }
    }

    if (isRefresh) {
      setLoading(false);
    } else if (!cacheLoaded) {
      setLoading(true);
    }

    try {
      const data = await adminService.getAllSchools();
      setSchools(data);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (err: any) {
      console.error('Error fetching schools:', err);
      if (err.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again');
        navigation.replace('Login');
      } else if (!isRefresh) {
        // Only alert if we don't have cached data and it's not a background refresh
        Alert.alert('Error', 'Failed to load schools');
      }
    } finally {
      if (!isRefresh || !cacheLoaded) {
        setLoading(false);
      }
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    const role = await AsyncStorage.getItem('userRole') || 'admin';
    const cacheKey = `admin_stats_cache_${role}`;

    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        setStats(JSON.parse(cached));
      }
    } catch (e) {}

    try {
      const statsData = await adminService.getSubscriptionStats();
      setStats(statsData);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(statsData));
    } catch (err) {
      console.error('Stats not available', err);
    }
  };

  useEffect(() => {
    setTabBarVisible(true);
    fetchSchools();
    fetchStats();
    return () => setTabBarVisible(true);
  }, []);

  useEffect(() => {
    if (route.params?.openCreateModal) {
      setCreateModalOpen(true);
      navigation.setParams({ openCreateModal: undefined } as any);
    }
  }, [route.params?.openCreateModal]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSchools(true), fetchStats()]);
    setRefreshing(false);
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const deltaY = currentScrollY - lastScrollY.current;
    
    if (currentScrollY <= 20) {
      setTabBarVisible(true);
    } else if (currentScrollY > 100 && deltaY > 10) {
      setTabBarVisible(false);
    } else if (deltaY < -10) {
      setTabBarVisible(true);
    }
    
    lastScrollY.current = currentScrollY;
  };


  const handleResendCredentials = async (school: School) => {
    try {
      await adminService.resendCredentials(school.id);
      Alert.alert('Success', 'Credentials resent to the registered school email');
    } catch (err: any) {
      Alert.alert('Error', formatErrorMessage(err?.response?.data?.detail) || 'Failed to resend credentials');
    }
  };

  const handleSendReminder = async (school: School) => {
    try {
      await adminService.sendReminder(school.id);
      Alert.alert('Success', `Reminder sent to ${school.email}`);
    } catch (err: any) {
      Alert.alert('Error', formatErrorMessage(err?.response?.data?.detail) || 'Failed to send reminder');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  // Filter schools
  const filteredSchools = useMemo(() => {
    let filtered = [...schools];
    
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(s => s.status === 'active');
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(s => s.status === 'inactive');
      } else {
        filtered = filtered.filter(s => s.subscription_status === statusFilter);
      }
    }
    
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.school_id || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.current_plan_name || '').toLowerCase().includes(q) ||
        (s.subscription_status || '').toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }, [schools, statusFilter, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSchools.length / ITEMS_PER_PAGE));
  const paginatedSchools = filteredSchools.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const filterOptions = [
    { value: 'all', label: 'All Schools' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'trial_active', label: 'Trial' },
    { value: 'active_paid', label: 'Paid' },
    { value: 'payment_due', label: 'Due' },
  ];

  const expiringSchools = schools.filter(s => {
    const days = getDaysLeft(s.trial_end_at || s.subscription_end_at || null);
    return days !== null && days <= 3 && days > 0;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

      {/* Standardized Header - Animated Slide In/Out */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          transform: [{ translateY: headerTranslateY }],
        }}
      >
        <LinearGradient
          colors={['#1e3a8a', '#3b82f6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerStandard, { paddingTop: insets.top + 10, paddingBottom: 20 }]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => (navigation as any).navigate('Profile')}
            style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}
          >
            <AvatarBubble
              displayName={userName || 'Admin'}
              size={34}
              textSize={13}
              primaryColor="#fff"
            />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <AppText style={styles.headerTitle} weight="bold">{isAgent ? 'Agent Portal' : 'Admin Portal'}</AppText>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.refreshIconBtn} onPress={() => (navigation as any).navigate('Notifications')}>
              <Bell size={20} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <AppText style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</AppText>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh} disabled={loading}>
              <RefreshCw size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 80 }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View>
            <AppText style={styles.welcomeTitle}>Good {getGreeting()}, {userName?.split(' ')[0] || 'Admin'}!</AppText>
            <AppText style={styles.welcomeSub}>Here is what is happening across your schools today.</AppText>
          </View>
          <View style={styles.dateBadge}>
            <Calendar size={12} color={colors.textMuted} />
            <AppText style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </AppText>
          </View>
        </View>

        {/* Expiring Alert */}
        {expiringSchools.length > 0 && (
          <View style={styles.alertBanner}>
            <AlertTriangle size={16} color={colors.warning} />
            <AppText style={styles.alertText}>
              {expiringSchools.length} school(s) have trials ending in 3 days or less!
            </AppText>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard title="Schools" value={stats?.total_schools || 0} icon={Home} color={colors.primary} loading={!stats} />
          <StatCard title="Paid" value={stats?.active_paid || 0} icon={CheckCircle} color={colors.success} loading={!stats} />
          <StatCard title="Trial" value={stats?.trial_active || 0} icon={Clock} color={colors.secondary} loading={!stats} />
          <StatCard title="Due" value={stats?.payment_due || 0} icon={AlertCircle} color={colors.warning} loading={!stats} />
        </View>

        {/* Filter Bar */}
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
            {filterOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filterChip, statusFilter === opt.value && styles.filterChipActive]}
                onPress={() => {
                  setStatusFilter(opt.value);
                  setCurrentPage(1);
                }}
              >
                <AppText style={[styles.filterChipText, statusFilter === opt.value && styles.filterChipTextActive]}>
                  {opt.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Search size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search schools..."
              placeholderTextColor={colors.textMuted}
              value={searchTerm}
              onChangeText={(text) => {
                setSearchTerm(text);
                setCurrentPage(1);
              }}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearBtn}>
                <X size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Create School Button */}
        <AppButton title="Register New School" icon="plus" onPress={() => setCreateModalOpen(true)} />

        {/* School List */}
        {loading && !refreshing ? (
          <View style={{ marginTop: 40 }}><Loader /></View>
        ) : paginatedSchools.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <Frown size={48} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 12 }} />
            <AppText style={styles.emptyTitle}>No schools found</AppText>
            <AppText style={styles.emptyText}>Try adjusting your search or filters</AppText>
          </AppCard>
        ) : (
          <>
            {paginatedSchools.map(school => (
              <SchoolCard
                key={school.id}
                school={school}
                onEdit={setEditTarget}
                onSubscription={setSubscriptionSchool}
                onResendCredentials={handleResendCredentials}
                onSendReminder={handleSendReminder}
                
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={18} color={currentPage === 1 ? colors.border : colors.textPrimary} />
                </TouchableOpacity>
                <AppText style={styles.pageInfo}>
                  Page {currentPage} of {totalPages}
                </AppText>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={18} color={currentPage === totalPages ? colors.border : colors.textPrimary} />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <SchoolFormModal
        visible={createModalOpen}
        mode="create"
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          fetchSchools();
          fetchStats();
        }}
      />
      <SchoolFormModal
        visible={!!editTarget}
        mode="edit"
        initialData={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => {
          fetchSchools();
          fetchStats();
        }}
      />
      <SubscriptionModal
        visible={!!subscriptionSchool}
        school={subscriptionSchool}
        onClose={() => setSubscriptionSchool(null)}
        onSuccess={() => {
          fetchSchools();
          fetchStats();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerStandard: {
    backgroundColor: '#001F3F',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: '#001F3F',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  welcomeSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.warningSoft,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  skeletonValue: {
    height: 24,
    width: '60%',
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  filterBar: {
    marginBottom: 16,
    gap: 12,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: colors.textPrimary,
  },
  clearBtn: {
    padding: 8,
  },
  schoolCard: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  schoolId: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    color: colors.accent,
    alignSelf: 'flex-start',
    marginBottom: 4,
    fontWeight: '700',
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'center',
  },
  detailLabel: {
    width: 90,
    fontSize: 13,
    color: colors.textMuted,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteBtn: {
    backgroundColor: colors.errorSoft,
    borderColor: colors.errorSoft,
  },
  actionBtnText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  deleteBtnText: {
    color: colors.error,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.warningSoft,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  pageBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageInfo: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  subscriptionModal: {
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    backgroundColor: colors.bg,
    color: colors.textPrimary,
  },
  formInputError: {
    borderColor: colors.error,
  },
  formError: {
    fontSize: 12,
    color: colors.error,
    marginTop: 6,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    paddingVertical: 14,
    marginRight: 24,
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  tabText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.accent,
  },
  infoGrid: {
    marginBottom: 24,
    gap: 12,
    backgroundColor: colors.bg,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerOptionActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pickerText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  pickerTextActive: {
    color: '#fff',
  },
  emptyPayments: {
    alignItems: 'center',
    padding: 40,
  },
  paymentItem: {
    backgroundColor: colors.bg,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentDate: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  paymentPlan: {
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 4,
    fontWeight: '600',
  },
  paymentMethod: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  paymentTxId: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 4,
  },
  deleteModal: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  deleteMessage: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteSchoolName: {
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteSchoolNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalContentLarge: {
    maxHeight: '95%',
  },
  modalTabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTabBtn: {
    paddingVertical: 14,
    marginRight: 24,
  },
  modalTabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  modalTabText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  modalTabTextActive: {
    color: colors.accent,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featureCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eef2f6',
    gap: 16,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  featureDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  inlineSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  inlineSelectorOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inlineSelectorOptionActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  inlineSelectorText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  inlineSelectorTextActive: {
    color: '#fff',
  },
  retentionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 12,
  },
  retentionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  retentionBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
