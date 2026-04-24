import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/feather';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/AppNavigator';

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
  onDelete: (school: School) => void;
}> = ({ school, onEdit, onSubscription, onResendCredentials, onDelete }) => {
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
        {school.trial_end_at && (
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
        {school.last_payment_amount && (
          <View style={styles.detailRow}>
            <AppText style={styles.detailLabel}>Last Payment:</AppText>
            <AppText style={styles.detailValue}>₹{school.last_payment_amount}</AppText>
          </View>
        )}
      </View>

      {isExpiringSoon && (
        <View style={styles.warningBanner}>
          <Icon name="alert-triangle" size={14} color={colors.warning} />
          <AppText style={styles.warningText}>Trial ending in {daysLeft} days!</AppText>
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(school)}>
          <Icon name="edit-2" size={12} color={colors.textMuted} />
          <AppText style={styles.actionBtnText}>Edit</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onSubscription(school)}>
          <Icon name="credit-card" size={12} color={colors.textMuted} />
          <AppText style={styles.actionBtnText}>Sub</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onResendCredentials(school)}>
          <Icon name="mail" size={12} color={colors.textMuted} />
          <AppText style={styles.actionBtnText}>Resend</AppText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.deleteBtn]} 
          onPress={() => onDelete(school)}
        >
          <Icon name="trash-2" size={12} color={colors.error} />
          <AppText style={[styles.actionBtnText, styles.deleteBtnText]}>Del</AppText>
        </TouchableOpacity>
      </View>
    </AppCard>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  color: string;
  loading?: boolean;
}> = ({ title, value, icon, color, loading }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Icon name={icon} size={20} color={color} style={{ marginBottom: 4 }} />
    {loading ? (
      <View style={styles.skeletonValue} />
    ) : (
      <AppText style={styles.statValue}>{value}</AppText>
    )}
    <AppText style={styles.statTitle}>{title}</AppText>
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
  const [formData, setFormData] = useState({
    school_id: '',
    name: '',
    email: '',
    address: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible && mode === 'edit' && initialData) {
      setFormData({
        school_id: initialData.school_id,
        name: initialData.name,
        email: initialData.email,
        address: initialData.address,
        status: initialData.status || 'active',
      });
    } else if (visible && mode === 'create') {
      setFormData({
        school_id: '',
        name: '',
        email: '',
        address: '',
        status: 'active',
      });
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
        await API.post('/schools', formData);
        Alert.alert('Success', 'School created successfully');
      } else {
        await API.put(`/schools/${initialData?.id}`, formData);
        Alert.alert('Success', 'School updated successfully');
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
        Alert.alert('Error', detail || 'Something went wrong');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle}>
              {mode === 'create' ? 'Register New School' : 'Edit School Details'}
            </AppText>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Icon name="x" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <AppText style={styles.formLabel}>School ID</AppText>
              <TextInput
                style={[styles.formInput, errors.school_id && styles.formInputError]}
                placeholder="e.g. SCH00123"
                placeholderTextColor={colors.textMuted}
                value={formData.school_id}
                onChangeText={(text) => setFormData(prev => ({ ...prev, school_id: text.toUpperCase() }))}
                editable={mode !== 'edit'}
              />
              {errors.school_id && <AppText style={styles.formError}>{errors.school_id}</AppText>}
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.formLabel}>School Name</AppText>
              <TextInput
                style={[styles.formInput, errors.name && styles.formInputError]}
                placeholder="e.g. Greenwood International School"
                placeholderTextColor={colors.textMuted}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              />
              {errors.name && <AppText style={styles.formError}>{errors.name}</AppText>}
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.formLabel}>Official Email</AppText>
              <TextInput
                style={[styles.formInput, errors.email && styles.formInputError]}
                placeholder="admin@school.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              />
              {errors.email && <AppText style={styles.formError}>{errors.email}</AppText>}
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.formLabel}>Address</AppText>
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

            <View style={styles.formGroup}>
              <AppText style={styles.formLabel}>Status</AppText>
              <View style={styles.switchRow}>
                <AppText style={styles.switchLabel}>Active</AppText>
                <Switch
                  value={formData.status === 'active'}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, status: val ? 'active' : 'inactive' }))}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <View style={{ flex: 1 }}>
              <AppButton title="Cancel" onPress={onClose} type="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton title={saving ? 'Saving...' : (mode === 'create' ? 'Create' : 'Save')} onPress={handleSave} disabled={saving} />
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
      const res = await API.get(`/schools/${school.id}/subscription`);
      setSubscription(res.data.subscription);
    } catch (err) {
      console.error('Failed to load subscription', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    if (!school) return;
    try {
      const res = await API.get(`/schools/${school.id}/payments`);
      setPayments(res.data.payments || []);
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
      await API.put(`/schools/${school.id}/subscription`, payload);
      Alert.alert('Success', 'Subscription updated successfully');
      await fetchSubscription();
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Update failed');
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
              <Icon name="x" size={18} color={colors.textMuted} />
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
                  {subscription.trial_end_at && (
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
                  <Icon name="dollar-sign" size={40} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 12 }} />
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
                    {payment.razorpay_payment_id && (
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
          <Icon name="alert-triangle" size={28} color={colors.error} />
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
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userName } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<School | null>(null);
  const [subscriptionSchool, setSubscriptionSchool] = useState<School | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);
  const [deleting, setDeleting] = useState(false);

  const ITEMS_PER_PAGE = 8;

  // Fetch schools
  const fetchSchools = async () => {
    setLoading(true);
    try {
      const res = await API.get('/schools/all');
      setSchools(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error('Error fetching schools:', err);
      if (err.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again');
        navigation.replace('Login');
      } else {
        Alert.alert('Error', 'Failed to load schools');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await API.get('/schools/subscription/stats');
      setStats(res.data.stats);
    } catch (err) {
      console.error('Stats not available', err);
    }
  };

  useEffect(() => {
    fetchSchools();
    fetchStats();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSchools(), fetchStats()]);
    setRefreshing(false);
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await API.delete(`/schools/${deleteTarget.id}`);
      Alert.alert('Success', 'School deleted successfully');
      setDeleteTarget(null);
      fetchSchools();
      fetchStats();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleResendCredentials = async (school: School) => {
    try {
      await API.post(`/schools/${school.id}/resend-credentials`);
      Alert.alert('Success', 'Credentials resent to the registered school email');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to resend credentials');
    }
  };

  const handleSendReminder = async (school: School) => {
    try {
      await API.post(`/schools/${school.id}/send-reminder`);
      Alert.alert('Success', `Reminder sent to ${school.email}`);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to send reminder');
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
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View>
            <AppText style={styles.welcomeTitle}>Good {getGreeting()}, {userName?.split(' ')[0] || 'Admin'}!</AppText>
            <AppText style={styles.welcomeSub}>Here is what is happening across your schools today.</AppText>
          </View>
          <View style={styles.dateBadge}>
            <Icon name="calendar" size={12} color={colors.textMuted} />
            <AppText style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </AppText>
          </View>
        </View>

        {/* Expiring Alert */}
        {expiringSchools.length > 0 && (
          <View style={styles.alertBanner}>
            <Icon name="alert-triangle" size={16} color={colors.warning} />
            <AppText style={styles.alertText}>
              {expiringSchools.length} school(s) have trials ending in 3 days or less!
            </AppText>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard title="Schools" value={stats?.total_schools || 0} icon="home" color={colors.primary} loading={!stats} />
          <StatCard title="Paid" value={stats?.active_paid || 0} icon="check-circle" color={colors.success} loading={!stats} />
          <StatCard title="Trial" value={stats?.trial_active || 0} icon="clock" color={colors.secondary} loading={!stats} />
          <StatCard title="Due" value={stats?.payment_due || 0} icon="alert-circle" color={colors.warning} loading={!stats} />
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
            <Icon name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
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
                <Icon name="x" size={14} color={colors.textMuted} />
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
            <Icon name="frown" size={48} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 12 }} />
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
                onDelete={setDeleteTarget}
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
                  <Icon name="chevron-left" size={18} color={currentPage === 1 ? colors.border : colors.textPrimary} />
                </TouchableOpacity>
                <AppText style={styles.pageInfo}>
                  Page {currentPage} of {totalPages}
                </AppText>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <Icon name="chevron-right" size={18} color={currentPage === totalPages ? colors.border : colors.textPrimary} />
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
      <DeleteConfirmModal
        visible={!!deleteTarget}
        school={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        deleting={deleting}
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
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
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
});
