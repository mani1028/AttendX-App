import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { X, Settings, Layers } from 'lucide-react-native';
import * as adminService from '../../../services/adminService';
import { colors, Theme } from '../../../theme/tokens';
import AppButton from '../../common/AppButton';
import AppText from '../../common/AppText';
import AdminInlineSelector from './AdminInlineSelector';
import { modalStyles } from './modalStyles';
import type { AdminSchool, AgentPermissions } from './types';
import { formatErrorMessage } from '../../../utils/helpers';

// School form modal
interface AdminSchoolFormModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  initialData?: AdminSchool | null;
  onClose: () => void;
  onSuccess: () => void;
  isAgent?: boolean;
  agentPermissions?: AgentPermissions;
}

export default function AdminSchoolFormModal({
  visible, mode, initialData, onClose, onSuccess, isAgent = false, agentPermissions,
}: AdminSchoolFormModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'features' | 'limits'>('general');
  const canManageFeatures = mode === 'create' || !isAgent || !!agentPermissions?.can_edit_features;
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
    attendance_frequency: 1,
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
        attendance_frequency: Number(initialData.attendance_frequency ?? 1) === 2 ? 2 : 1,
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
        attendance_frequency: 1,
      });
      setActiveTab('general');
    }
    setErrors({});
  }, [visible, mode, initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.school_id.trim()) {newErrors.school_id = 'School ID is required';}
    if (!formData.name.trim()) {newErrors.name = 'School name is required';}
    if (!formData.email.trim()) {newErrors.email = 'Email is required';}
    else if (!/\S+@\S+\.\S+/.test(formData.email)) {newErrors.email = 'Invalid email';}
    if (!formData.address.trim()) {newErrors.address = 'Address is required';}
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {return;}
    setSaving(true);
    try {
      if (mode === 'create') {
        const createPayload: Record<string, unknown> = {
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
          attendance_frequency: formData.attendance_frequency,
        };
        if (formData.custom_max_branches.trim()) {
          const branchVal = formData.custom_max_branches.trim();
          createPayload.custom_max_branches =
            branchVal === '∞' ? null : parseInt(branchVal, 10);
        }
        await adminService.createSchool(createPayload);
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
          attendance_frequency: formData.attendance_frequency,
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
    { label: 'Inactive', value: 'inactive' },
  ];

  const subStatusOptions = [
    { label: 'Active Paid', value: 'active_paid' },
    { label: 'Trial Active', value: 'trial_active' },
    { label: 'Payment Due', value: 'payment_due' },
    { label: 'Suspended', value: 'suspended' },
  ];

  const reportsOptions = [
    { label: 'Basic', value: 'basic' },
    { label: 'Advanced', value: 'advanced' },
  ];

  const timelineOptions = [
    { label: 'Daily (24h)', value: 'daily' },
    { label: 'Weekly (7d)', value: 'weekly' },
    { label: 'Monthly (30d)', value: 'monthly' },
  ];

  const attendanceFrequencyOptions = [
    { label: 'Once', value: 1 },
    { label: 'Twice', value: 2 },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <View style={modalStyles.modalOverlay}>
        <View style={[modalStyles.modalContent, mode === 'edit' && modalStyles.modalContentLarge]}>
          <View style={modalStyles.modalHeader}>
            <View style={{ flex: 1 }}>
              <AppText style={modalStyles.modalTitle}>
                {mode === 'create' ? 'Register New School' : 'Edit School & Features'}
              </AppText>
              {mode === 'edit' && (
                <AppText style={{ ...Theme.typography.caption, color: colors.textMuted }}>{formData.name}</AppText>
              )}
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={modalStyles.modalClose}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Modal Tabs */}
          <View style={modalStyles.modalTabBar}>
              <TouchableOpacity accessibilityRole="button"
                style={[modalStyles.modalTabBtn, activeTab === 'general' && modalStyles.modalTabBtnActive]}
                onPress={() => setActiveTab('general')}
              >
                <AppText style={[modalStyles.modalTabText, activeTab === 'general' && modalStyles.modalTabTextActive]}>
                  General
                </AppText>
              </TouchableOpacity>
              {canManageFeatures && (
                <TouchableOpacity accessibilityRole="button"
                  style={[modalStyles.modalTabBtn, activeTab === 'features' && modalStyles.modalTabBtnActive]}
                  onPress={() => setActiveTab('features')}
                >
                  <AppText style={[modalStyles.modalTabText, activeTab === 'features' && modalStyles.modalTabTextActive]}>
                    Features
                  </AppText>
                </TouchableOpacity>
              )}
              {canManageFeatures && (
                <TouchableOpacity accessibilityRole="button"
                  style={[modalStyles.modalTabBtn, activeTab === 'limits' && modalStyles.modalTabBtnActive]}
                  onPress={() => setActiveTab('limits')}
                >
                  <AppText style={[modalStyles.modalTabText, activeTab === 'limits' && modalStyles.modalTabTextActive]}>
                    Data & Limits
                  </AppText>
                </TouchableOpacity>
              )}
          </View>

          <ScrollView style={modalStyles.modalBody}>
            {loadingSub ? (
              <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={colors.accent} /></View>
            ) : (
              <View style={{ paddingBottom: Theme.spacing.lg }}>
                {activeTab === 'general' && (
                  <View style={{ gap: Theme.spacing.md }}>
                    <View style={{ flexDirection: 'row', gap: Theme.spacing.md }}>
                      <View style={[modalStyles.formGroup, { flex: 1 }]}>
                        <AppText style={modalStyles.formLabel}>School ID</AppText>
                        <TextInput
                          style={[modalStyles.formInput, mode === 'edit' && { backgroundColor: Theme.colors.background, color: colors.accent, fontWeight: '700' }, errors.school_id && modalStyles.formInputError]}
                          value={formData.school_id}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, school_id: text.toUpperCase() }))}
                          editable={mode === 'create'}
                          placeholder="e.g. SCH00123"
                        />
                        {errors.school_id && <AppText style={modalStyles.formError}>{errors.school_id}</AppText>}
                      </View>
                      <View style={[modalStyles.formGroup, { flex: 2 }]}>
                        <AppText style={modalStyles.formLabel}>* School Name</AppText>
                        <TextInput
                          style={[modalStyles.formInput, errors.name && modalStyles.formInputError]}
                          value={formData.name}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                          placeholder="School Name"
                        />
                        {errors.name && <AppText style={modalStyles.formError}>{errors.name}</AppText>}
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: Theme.spacing.md }}>
                      <View style={[modalStyles.formGroup, { flex: 1 }]}>
                        <AppText style={modalStyles.formLabel}>Director Name</AppText>
                        <TextInput
                          style={modalStyles.formInput}
                          value={formData.director_name}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, director_name: text }))}
                          placeholder="Full Name"
                        />
                      </View>
                      <View style={[modalStyles.formGroup, { flex: 1 }]}>
                        <AppText style={modalStyles.formLabel}>* Director Email</AppText>
                        <TextInput
                          style={[modalStyles.formInput, errors.email && modalStyles.formInputError]}
                          value={formData.email}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                          placeholder="visys1@gmail.com"
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                        {errors.email && <AppText style={modalStyles.formError}>{errors.email}</AppText>}
                      </View>
                    </View>

                    <View style={modalStyles.formGroup}>
                      <AppText style={modalStyles.formLabel}>* Address</AppText>
                      <TextInput
                        style={[modalStyles.formInput, modalStyles.textArea, errors.address && modalStyles.formInputError]}
                        placeholder="Full address..."
                        placeholderTextColor={colors.textMuted}
                        multiline
                        numberOfLines={3}
                        value={formData.address}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
                      />
                      {errors.address && <AppText style={modalStyles.formError}>{errors.address}</AppText>}
                    </View>

                    {/* Section: Subscription & Status */}
                    <View style={modalStyles.sectionHeader}>
                      <Settings size={14} color={colors.accent} style={{ marginRight: 6 }} />
                      <AppText style={modalStyles.sectionHeaderText}>Subscription & Status</AppText>
                    </View>

                    <View style={modalStyles.formGroup}>
                      <AppText style={modalStyles.formLabel}>System Status</AppText>
                      <AdminInlineSelector
                        options={statusOptions}
                        selectedValue={formData.status}
                        onSelect={(val) => setFormData(prev => ({ ...prev, status: String(val) }))}
                      />
                    </View>

                    {(!isAgent || agentPermissions?.can_view_payments) && (
                      <>
                        <View style={modalStyles.formGroup}>
                          <AppText style={modalStyles.formLabel}>Subscription State</AppText>
                          <AdminInlineSelector
                            options={subStatusOptions}
                            selectedValue={formData.subscription_status}
                            onSelect={(val) => setFormData(prev => ({ ...prev, subscription_status: String(val) }))}
                          />
                        </View>

                        <View style={{ flexDirection: 'row', gap: Theme.spacing.md }}>
                          <View style={[modalStyles.formGroup, { flex: 1 }]}>
                            <AppText style={modalStyles.formLabel}>Extend Plan (Days)</AppText>
                            <TextInput
                              style={modalStyles.formInput}
                              keyboardType="numeric"
                              placeholder="e.g. 15"
                              value={formData.extend_plan_days}
                              onChangeText={(text) => setFormData(prev => ({ ...prev, extend_plan_days: text }))}
                            />
                          </View>
                          <View style={[modalStyles.formGroup, { flex: 2 }]}>
                            <AppText style={modalStyles.formLabel}>Reason for Extension</AppText>
                            <TextInput
                              style={modalStyles.formInput}
                              placeholder="e.g. Setup delay"
                              value={formData.extend_reason}
                              onChangeText={(text) => setFormData(prev => ({ ...prev, extend_reason: text }))}
                            />
                          </View>
                        </View>

                        <View style={modalStyles.formGroup}>
                          <AppText style={modalStyles.formLabel}>Extended By (Name)</AppText>
                          <TextInput
                            style={modalStyles.formInput}
                            placeholder="Enter your name"
                            value={formData.extended_by_name}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, extended_by_name: text }))}
                          />
                        </View>
                      </>
                    )}
                  </View>
                )}

                {activeTab === 'features' && (
                  <View>
                    {/* Section: Attendance Capabilities */}
                    <View style={modalStyles.sectionHeader}>
                      <Layers size={14} color={colors.accent} style={{ marginRight: 6 }} />
                      <AppText style={modalStyles.sectionHeaderText}>Attendance Capabilities</AppText>
                    </View>

                    <View style={modalStyles.featureCard}>
                      {[
                        { key: 'enable_manual_attendance', label: 'Manual Attendance', desc: 'Standard staff-marked attendance' },
                        { key: 'enable_photo_attendance', label: 'Photo Attendance', desc: 'Face recognition via snapshots' },
                        { key: 'enable_video_attendance', label: 'Video Attendance', desc: 'Live stream face tracking' },
                        { key: 'aadhaar_verification_required', label: 'Aadhaar OCR', desc: 'Extract data from identity cards' },
                      ].map(item => (
                        <View key={item.key} style={modalStyles.featureRow}>
                          <View style={modalStyles.featureTextContainer}>
                            <AppText style={modalStyles.featureTitle}>{item.label}</AppText>
                            <AppText style={modalStyles.featureDesc}>{item.desc}</AppText>
                          </View>
                          <Switch
                            value={(formData as any)[item.key]}
                            onValueChange={(val) => setFormData(prev => ({ ...prev, [item.key]: val }))}
                            trackColor={{ false: colors.border, true: colors.accent }}
                            thumbColor={Platform.OS === 'android' ? Theme.colors.card : undefined}
                          />
                        </View>
                      ))}
                    </View>

                    {/* Section: Limits */}
                    <View style={modalStyles.sectionHeader}>
                      <Layers size={14} color={colors.accent} style={{ marginRight: 6 }} />
                      <AppText style={modalStyles.sectionHeaderText}>Limits</AppText>
                    </View>

                    <View style={modalStyles.featureCard}>
                      <View style={modalStyles.featureRow}>
                        <View style={modalStyles.featureTextContainer}>
                          <AppText style={modalStyles.featureTitle}>Max Branches</AppText>
                          <AppText style={modalStyles.featureDesc}>Revert to plan default if empty</AppText>
                        </View>
                        <TextInput
                          style={[modalStyles.formInput, { width: 100, padding: Theme.spacing.sm }]}
                          placeholder="∞"
                          value={formData.custom_max_branches}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, custom_max_branches: text }))}
                          keyboardType="numeric"
                        />
                      </View>

                      <View style={[modalStyles.featureRow, { borderTopWidth: 1, borderTopColor: '#eef2f6', paddingTop: Theme.spacing.md, marginTop: Theme.spacing.md }]}>
                        <View style={modalStyles.featureTextContainer}>
                          <AppText style={modalStyles.featureTitle}>Reports Level</AppText>
                          <AppText style={modalStyles.featureDesc}>Basic report exports or detailed insights</AppText>
                        </View>
                        <AdminInlineSelector
                          options={reportsOptions}
                          selectedValue={formData.reports}
                          onSelect={(val) => setFormData(prev => ({ ...prev, reports: String(val) }))}
                        />
                      </View>

                      <View style={[modalStyles.featureRow, { borderTopWidth: 1, borderTopColor: '#eef2f6', paddingTop: Theme.spacing.md, marginTop: Theme.spacing.md }]}>
                        <View style={modalStyles.featureTextContainer}>
                          <AppText style={modalStyles.featureTitle}>Daily Attendance</AppText>
                          <AppText style={modalStyles.featureDesc}>Mark attendance once or twice per day</AppText>
                        </View>
                        <AdminInlineSelector
                          options={attendanceFrequencyOptions}
                          selectedValue={formData.attendance_frequency}
                          onSelect={(val) => setFormData(prev => ({
                            ...prev,
                            attendance_frequency: Number(val) === 2 ? 2 : 1,
                          }))}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {activeTab === 'limits' && (
                  <View>
                    {/* Section: Media Retention */}
                    <View style={modalStyles.sectionHeader}>
                      <Layers size={14} color={colors.accent} style={{ marginRight: 6 }} />
                      <AppText style={modalStyles.sectionHeaderText}>Media Retention</AppText>
                    </View>

                    <View style={modalStyles.featureCard}>
                      <View style={modalStyles.featureRow}>
                        <View style={modalStyles.featureTextContainer}>
                          <AppText style={modalStyles.featureTitle}>Save Media</AppText>
                          <AppText style={modalStyles.featureDesc}>Store attendance verification evidence</AppText>
                        </View>
                        <Switch
                          value={formData.save_attendance_media}
                          onValueChange={(val) => setFormData(prev => ({
                            ...prev,
                            save_attendance_media: val,
                            enable_storage_timeline: val ? prev.enable_storage_timeline : false,
                          }))}
                          trackColor={{ false: colors.border, true: colors.accent }}
                          thumbColor={Platform.OS === 'android' ? Theme.colors.card : undefined}
                        />
                      </View>

                      <View style={[
                        modalStyles.featureRow,
                        { borderTopWidth: 1, borderTopColor: '#eef2f6', paddingTop: Theme.spacing.md, marginTop: Theme.spacing.md },
                        !formData.save_attendance_media && { opacity: 0.5 },
                      ]}>
                        <View style={modalStyles.featureTextContainer}>
                          <AppText style={modalStyles.featureTitle}>Retention</AppText>
                          <AppText style={modalStyles.featureDesc}>Enable auto-purging storage timeline</AppText>
                        </View>
                        <Switch
                          value={formData.enable_storage_timeline}
                          onValueChange={(val) => setFormData(prev => ({ ...prev, enable_storage_timeline: val }))}
                          disabled={!formData.save_attendance_media}
                          trackColor={{ false: colors.border, true: colors.accent }}
                          thumbColor={Platform.OS === 'android' ? Theme.colors.card : undefined}
                        />
                      </View>
                    </View>

                    {/* Retention Period Card */}
                    <View style={[
                      modalStyles.retentionCard,
                      {
                        backgroundColor: (formData.save_attendance_media && formData.enable_storage_timeline) ? '#f5f3ff' : Theme.colors.card,
                        borderColor: (formData.save_attendance_media && formData.enable_storage_timeline) ? colors.accent : '#eef2f6',
                        opacity: (formData.save_attendance_media && formData.enable_storage_timeline) ? 1 : 0.6,
                      },
                    ]}>
                      <View style={modalStyles.retentionHeader}>
                        <AppText style={modalStyles.featureTitle}>Retention Timeline</AppText>
                        {(formData.save_attendance_media && formData.enable_storage_timeline) && (
                          <AppText style={modalStyles.retentionBadge}>Active</AppText>
                        )}
                      </View>

                      <AppText style={{ ...Theme.typography.label, color: (formData.save_attendance_media && formData.enable_storage_timeline) ? Theme.colors.textSec : Theme.colors.textMuted, marginBottom: Theme.spacing.md }}>
                        {(formData.save_attendance_media && formData.enable_storage_timeline)
                          ? 'Choose how long attendance media should be kept once Save Media is enabled.'
                          : 'Enable Save Media and Retention to choose the retention period for images and videos.'}
                      </AppText>

                      <AdminInlineSelector
                        options={timelineOptions}
                        selectedValue={formData.media_retention_timeline}
                        onSelect={(val) => setFormData(prev => ({ ...prev, media_retention_timeline: String(val) }))}
                        disabled={!formData.save_attendance_media || !formData.enable_storage_timeline}
                      />

                      <AppText style={{ ...Theme.typography.label, color: (formData.save_attendance_media && formData.enable_storage_timeline) ? Theme.colors.textSec : Theme.colors.textMuted, marginTop: Theme.spacing.md }}>
                        Images/Videos will be permanently deleted after the selected period.
                      </AppText>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <View style={modalStyles.modalFooter}>
            <View style={{ flex: 1 }}>
              <AppButton title="Cancel" onPress={onClose} type="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton title={saving ? 'Saving...' : 'Save All Changes'} onPress={handleSave} disabled={saving} />
            </View>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
