import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Switch,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';

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
const getAuthToken = async (): Promise<string> => {
  return (await AsyncStorage.getItem('token')) || '';
};

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
  if (days === null) return '#64748b';
  if (days < 0) return '#ef4444';
  if (days <= 3) return '#f59e0b';
  return '#10b981';
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string; type?: 'school' | 'subscription' }> = ({ 
  status, 
  type = 'school' 
}) => {
  if (type === 'school') {
    const isActive = status?.toLowerCase() === 'active';
    return (
      <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
        <View style={[styles.statusDot, isActive ? styles.dotActive : styles.dotInactive]} />
        <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
          {isActive ? 'Active' : 'Inactive'}
        </Text>
      </View>
    );
  }

  // Subscription status
  const getStatusConfig = () => {
    const s = status?.toLowerCase() || '';
    if (s === 'active_paid') return { color: '#10b981', bg: '#d1fae5', label: 'Active Paid' };
    if (s === 'trial_active') return { color: '#3b82f6', bg: '#dbeafe', label: 'Trial Active' };
    if (s === 'payment_due') return { color: '#f59e0b', bg: '#fef3c7', label: 'Payment Due' };
    return { color: '#ef4444', bg: '#fee2e2', label: status || 'Unknown' };
  };
  const config = getStatusConfig();
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
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
}> = ({ school, onEdit, onSubscription, onResendCredentials, onSendReminder, onDelete }) => {
  const daysLeft = getDaysLeft(school.trial_end_at || school.subscription_end_at || null);
  const daysLeftColor = getDaysLeftColor(daysLeft);
  const isExpiringSoon = daysLeft !== null && daysLeft <= 3 && daysLeft > 0;

  return (
    <AppCard style={styles.schoolCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.schoolId}>{school.school_id}</Text>
          <Text style={styles.schoolName}>{school.name}</Text>
        </View>
        <StatusBadge status={school.status} type="school" />
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email:</Text>
          <Text style={styles.detailValue}>{school.email}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Plan:</Text>
          <Text style={styles.detailValue}>{school.current_plan_name || 'Basic Attendance'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status:</Text>
          <StatusBadge status={school.subscription_status || ''} type="subscription" />
        </View>
        {school.trial_end_at && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Trial End:</Text>
            <Text style={[styles.detailValue, { color: daysLeftColor }]}>
              {formatDate(school.trial_end_at)}
              {daysLeft !== null && (
                <Text style={{ fontSize: 11 }}> ({daysLeft < 0 ? 'Expired' : `${daysLeft} days left`})</Text>
              )}
            </Text>
          </View>
        )}
        {school.last_payment_amount && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Payment:</Text>
            <Text style={styles.detailValue}>₹{school.last_payment_amount}</Text>
          </View>
        )}
      </View>

      {isExpiringSoon && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>Trial ending in {daysLeft} days!</Text>
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(school)}>
          <Text style={styles.actionBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onSubscription(school)}>
          <Text style={styles.actionBtnText}>💳 Sub</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onResendCredentials(school)}>
          <Text style={styles.actionBtnText}>📧 Resend</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.deleteBtn]} 
          onPress={() => onDelete(school)}
        >
          <Text style={[styles.actionBtnText, styles.deleteBtnText]}>🗑️ Del</Text>
        </TouchableOpacity>
      </View>
    </AppCard>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: number;
  icon: string;
  color: string;
}> = ({ title, value, icon, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
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
            <Text style={styles.modalTitle}>
              {mode === 'create' ? '➕ Register New School' : '✏️ Edit School Details'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>School ID</Text>
              <TextInput
                style={[styles.formInput, errors.school_id && styles.formInputError]}
                placeholder="e.g. SCH00123"
                value={formData.school_id}
                onChangeText={(text) => setFormData(prev => ({ ...prev, school_id: text.toUpperCase() }))}
                editable={mode !== 'edit'}
              />
              {errors.school_id && <Text style={styles.formError}>{errors.school_id}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>School Name</Text>
              <TextInput
                style={[styles.formInput, errors.name && styles.formInputError]}
                placeholder="e.g. Greenwood International School"
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              />
              {errors.name && <Text style={styles.formError}>{errors.name}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Official Email</Text>
              <TextInput
                style={[styles.formInput, errors.email && styles.formInputError]}
                placeholder="admin@school.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              />
              {errors.email && <Text style={styles.formError}>{errors.email}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Address</Text>
              <TextInput
                style={[styles.formInput, styles.textArea, errors.address && styles.formInputError]}
                placeholder="Full address..."
                multiline
                numberOfLines={3}
                value={formData.address}
                onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
              />
              {errors.address && <Text style={styles.formError}>{errors.address}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Status</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Active</Text>
                <Switch
                  value={formData.status === 'active'}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, status: val ? 'active' : 'inactive' }))}
                  trackColor={{ false: '#e4e9f2', true: '#2563eb' }}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <AppButton title="Cancel" onPress={onClose} type="secondary" />
            <AppButton title={saving ? 'Saving...' : (mode === 'create' ? 'Create School' : 'Save Changes')} onPress={handleSave} disabled={saving} />
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
          <View style={styles.modalContent}>
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
            <Text style={styles.modalTitle}>
              Manage Subscription - {school?.name || 'School'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Buttons */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'manage' && styles.tabBtnActive]}
              onPress={() => setActiveTab('manage')}
            >
              <Text style={[styles.tabText, activeTab === 'manage' && styles.tabTextActive]}>
                💳 Manage
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
              onPress={() => setActiveTab('history')}
            >
              <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
                📜 History
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {activeTab === 'manage' && subscription && (
              <>
                {isExpiringSoon && (
                  <View style={styles.warningBanner}>
                    <Text style={styles.warningIcon}>⚠️</Text>
                    <Text style={styles.warningText}>Trial ending in {daysLeft} days!</Text>
                  </View>
                )}
                {isExpired && (
                  <View style={[styles.warningBanner, styles.warningBannerUrgent]}>
                    <Text style={styles.warningIcon}>🔴</Text>
                    <Text style={styles.warningText}>Subscription expired! Access blocked.</Text>
                  </View>
                )}

                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Current Plan</Text>
                    <Text style={styles.infoValue}>{subscription.current_plan_name || 'Basic Attendance'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Status</Text>
                    <StatusBadge status={subscription.subscription_status || ''} type="subscription" />
                  </View>
                  {subscription.trial_end_at && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Trial End Date</Text>
                      <Text style={styles.infoValue}>{formatDate(subscription.trial_end_at)}</Text>
                    </View>
                  )}
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Access Enabled</Text>
                    <Text style={[styles.infoValue, subscription.access_enabled ? styles.textSuccess : styles.textError]}>
                      {subscription.access_enabled ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Extend trial (days)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    placeholder="0"
                    value={extendDays}
                    onChangeText={setExtendDays}
                  />
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Mark as paid</Text>
                    <Switch
                      value={markPaid}
                      onValueChange={setMarkPaid}
                      trackColor={{ false: '#e4e9f2', true: '#2563eb' }}
                    />
                  </View>
                </View>

                {markPaid && (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Amount paid (₹)</Text>
                      <TextInput
                        style={styles.formInput}
                        keyboardType="numeric"
                        placeholder="Enter amount"
                        value={amountPaid}
                        onChangeText={setAmountPaid}
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Payment method</Text>
                      <View style={styles.pickerContainer}>
                        {['card', 'upi', 'netbanking', 'wallet'].map(method => (
                          <TouchableOpacity
                            key={method}
                            style={[styles.pickerOption, paymentMethod === method && styles.pickerOptionActive]}
                            onPress={() => setPaymentMethod(method)}
                          >
                            <Text style={[styles.pickerText, paymentMethod === method && styles.pickerTextActive]}>
                              {method.charAt(0).toUpperCase() + method.slice(1)}
                            </Text>
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
                  <Text style={styles.emptyIcon}>💰</Text>
                  <Text style={styles.emptyText}>No payment records found</Text>
                </View>
              ) : (
                payments.map((payment, index) => (
                  <View key={payment.id || index} style={styles.paymentItem}>
                    <View style={styles.paymentHeader}>
                      <Text style={styles.paymentDate}>{formatDate(payment.paid_at)}</Text>
                      <Text style={[styles.paymentStatus, payment.status === 'paid' ? styles.statusPaid : styles.statusPending]}>
                        {payment.status}
                      </Text>
                    </View>
                    <Text style={styles.paymentAmount}>₹{payment.amount}</Text>
                    <Text style={styles.paymentPlan}>Plan: {payment.plan_name}</Text>
                    <Text style={styles.paymentMethod}>Method: {payment.payment_method}</Text>
                    {payment.razorpay_payment_id && (
                      <Text style={styles.paymentTxId}>TX: {payment.razorpay_payment_id}</Text>
                    )}
                  </View>
                ))
              )
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <AppButton title="Cancel" onPress={onClose} type="secondary" />
            <AppButton title={saving ? 'Saving...' : 'Save Changes'} onPress={handleSave} disabled={saving} />
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
          <Text style={styles.deleteIcon}>⚠️</Text>
        </View>
        <Text style={styles.deleteTitle}>Delete School?</Text>
        <Text style={styles.deleteMessage}>
          This action is permanent. The following school will be removed:
        </Text>
        <View style={styles.deleteSchoolName}>
          <Text style={styles.deleteSchoolNameText}>
            {school?.school_id} — {school?.name}
          </Text>
        </View>
        <View style={styles.deleteActions}>
          <AppButton title="Cancel" onPress={onCancel} type="secondary" />
          <AppButton title={deleting ? 'Deleting...' : 'Yes, Delete'} onPress={onConfirm} disabled={deleting} />
        </View>
      </View>
    </View>
  </Modal>
);

export default function AdminDashboardScreen() {
  const navigation = useNavigation();
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

  // Check admin role
  useEffect(() => {
    const checkRole = async () => {
      const role = await getUserRole();
      if (role !== 'admin') {
        navigation.replace('Login' as never);
      }
    };
    checkRole();
  }, [navigation]);

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
        navigation.replace('Login' as never);
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
    { value: 'payment_due', label: 'Payment Due' },
  ];

  const expiringSchools = schools.filter(s => {
    const days = getDaysLeft(s.trial_end_at || s.subscription_end_at || null);
    return days !== null && days <= 3 && days > 0;
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🏫 School Dashboard</Text>
        </View>

        {/* Expiring Alert */}
        {expiringSchools.length > 0 && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <Text style={styles.alertText}>
              {expiringSchools.length} school(s) have trials ending in 3 days or less!
            </Text>
          </View>
        )}

        {/* Stats Grid */}
        {stats && (
          <View style={styles.statsGrid}>
            <StatCard title="Total Schools" value={stats.total_schools} icon="🏫" color="#3b82f6" />
            <StatCard title="Active Paid" value={stats.active_paid} icon="✅" color="#10b981" />
            <StatCard title="Trial Active" value={stats.trial_active} icon="⏳" color="#3b82f6" />
            <StatCard title="Payment Due" value={stats.payment_due} icon="⚠️" color="#f59e0b" />
            <StatCard title="Inactive" value={stats.inactive} icon="❌" color="#ef4444" />
            <StatCard title="Revenue (Month)" value={stats.revenue_this_month} icon="💰" color="#8b5cf6" />
          </View>
        )}

        {/* Filter Bar */}
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterChips}>
              {filterOptions.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.filterChip, statusFilter === opt.value && styles.filterChipActive]}
                  onPress={() => {
                    setStatusFilter(opt.value);
                    setCurrentPage(1);
                  }}
                >
                  <Text style={[styles.filterChipText, statusFilter === opt.value && styles.filterChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Search */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, ID, email..."
              placeholderTextColor="#94a3b8"
              value={searchTerm}
              onChangeText={(text) => {
                setSearchTerm(text);
                setCurrentPage(1);
              }}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Create School Button */}
        <AppButton title="➕ Register New School" onPress={() => setCreateModalOpen(true)} />

        {/* School List */}
        {loading ? (
          <Loader />
        ) : paginatedSchools.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🏫</Text>
            <Text style={styles.emptyTitle}>No schools found</Text>
            <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
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
                  <Text style={styles.pageBtnText}>◀</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>
                  Page {currentPage} of {totalPages}
                </Text>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <Text style={styles.pageBtnText}>▶</Text>
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
    backgroundColor: '#f0f2f7',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0d1b2a',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
  },
  alertIcon: {
    fontSize: 16,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0d1b2a',
  },
  statTitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
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
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 13,
    color: '#4a5568',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e9f2',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#0d1b2a',
  },
  clearBtn: {
    padding: 8,
  },
  clearBtnText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  schoolCard: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  schoolId: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    color: '#2563eb',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    width: 100,
    fontSize: 13,
    color: '#64748b',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#0d1b2a',
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  deleteBtn: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  actionBtnText: {
    fontSize: 12,
    color: '#4a5568',
  },
  deleteBtnText: {
    color: '#dc2626',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#10b981',
  },
  dotInactive: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#15803d',
  },
  statusTextInactive: {
    color: '#b91c1c',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  warningBannerUrgent: {
    backgroundColor: '#fee2e2',
  },
  warningIcon: {
    fontSize: 14,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0d1b2a',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
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
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e9f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 14,
    color: '#4a5568',
  },
  pageInfo: {
    fontSize: 13,
    color: '#64748b',
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
    maxHeight: '90%',
  },
  subscriptionModal: {
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#4a5568',
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4e9f2',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e4e9f2',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f8fafc',
  },
  formInputError: {
    borderColor: '#dc2626',
  },
  formError: {
    fontSize: 11,
    color: '#dc2626',
    marginTop: 4,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    color: '#0d1b2a',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 13,
    color: '#64748b',
  },
  tabTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  infoGrid: {
    marginBottom: 20,
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0d1b2a',
  },
  textSuccess: {
    color: '#10b981',
  },
  textError: {
    color: '#dc2626',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  pickerOptionActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pickerText: {
    fontSize: 13,
    color: '#4a5568',
  },
  pickerTextActive: {
    color: '#fff',
  },
  emptyPayments: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
  },
  paymentItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentDate: {
    fontSize: 12,
    color: '#64748b',
  },
  paymentStatus: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusPaid: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0d1b2a',
    marginBottom: 4,
  },
  paymentPlan: {
    fontSize: 12,
    color: '#4a5568',
    marginBottom: 2,
  },
  paymentMethod: {
    fontSize: 12,
    color: '#4a5568',
    marginBottom: 2,
  },
  paymentTxId: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  deleteModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  deleteIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deleteIcon: {
    fontSize: 28,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0d1b2a',
    marginBottom: 8,
  },
  deleteMessage: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteSchoolName: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
  },
  deleteSchoolNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b91c1c',
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
});