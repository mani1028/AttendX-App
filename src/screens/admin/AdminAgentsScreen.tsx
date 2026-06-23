import { useNavigation } from '@react-navigation/native';
import { Theme } from '../../theme/tokens';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, Plus, Edit2, Users, Mail, Power } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import * as adminService from '../../services/adminService';
import { colors } from '../../theme/tokens';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import Loader from '../../components/common/Loader';
import { formatErrorMessage } from '../../utils/helpers';
import StandardPageHeader from '../../components/layout/StandardPageHeader';

// Agent Interface
interface Agent {
  id: string;
  full_name: string;
  username: string;
  email: string;
  is_active: boolean;
  can_register_school: boolean;
  can_view_payments: boolean;
  can_edit_features: boolean;
}

// Agent Form Modal (Create / Edit)
const AgentFormModal: React.FC<{
  visible: boolean;
  mode: 'create' | 'edit';
  initialData?: Agent | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ visible, mode, initialData, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    can_register_school: true,
    can_view_payments: true,
    can_edit_features: false,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible && mode === 'edit' && initialData) {
      setFormData({
        full_name: initialData.full_name,
        username: initialData.username,
        email: initialData.email,
        password: '',
        can_register_school: initialData.can_register_school,
        can_view_payments: initialData.can_view_payments,
        can_edit_features: initialData.can_edit_features,
        is_active: initialData.is_active,
      });
    } else if (visible && mode === 'create') {
      setFormData({
        full_name: '',
        username: '',
        email: '',
        password: '',
        can_register_school: true,
        can_view_payments: true,
        can_edit_features: false,
        is_active: true,
      });
    }
    setErrors({});
  }, [visible, mode, initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.full_name.trim()) {newErrors.full_name = 'Full name is required';}
    if (!formData.username.trim()) {newErrors.username = 'Username is required';}
    if (!formData.email.trim()) {newErrors.email = 'Email is required';}
    else if (!/\S+@\S+\.\S+/.test(formData.email)) {newErrors.email = 'Invalid email';}
    if (mode === 'create' && !formData.password.trim()) {newErrors.password = 'Password is required';}
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {return;}
    setSaving(true);
    try {
      if (mode === 'create') {
        await adminService.createAgent(formData);
        Alert.alert('Success', 'Agent registered successfully');
      } else {
        const payload: any = { ...formData };
        if (!payload.password) {delete payload.password;}
        await adminService.updateAgent(initialData?.id || '', payload);
        Alert.alert('Success', 'Agent updated successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      Alert.alert('Error', formatErrorMessage(detail) || 'Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle}>
              {mode === 'create' ? 'Register Agent' : 'Edit Agent'}
            </AppText>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.modalClose}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <AppText style={styles.formLabel}>Full Name</AppText>
              <TextInput
                style={[styles.formInput, errors.full_name && styles.formInputError]}
                placeholder="Agent's full name"
                placeholderTextColor={colors.textMuted}
                value={formData.full_name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, full_name: text }))}
              />
              {errors.full_name && <AppText style={styles.formError}>{errors.full_name}</AppText>}
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.formLabel}>Username</AppText>
              <TextInput
                style={[styles.formInput, errors.username && styles.formInputError]}
                placeholder="Unique username"
                placeholderTextColor={colors.textMuted}
                value={formData.username}
                onChangeText={(text) => setFormData(prev => ({ ...prev, username: text.toLowerCase() }))}
                editable={mode !== 'edit'}
              />
              {errors.username && <AppText style={styles.formError}>{errors.username}</AppText>}
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.formLabel}>Email Address</AppText>
              <TextInput
                style={[styles.formInput, errors.email && styles.formInputError]}
                placeholder="Official email"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              />
              {errors.email && <AppText style={styles.formError}>{errors.email}</AppText>}
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.formLabel}>
                {mode === 'create' ? 'Password' : 'Change Password (Optional)'}
              </AppText>
              <TextInput
                style={[styles.formInput, errors.password && styles.formInputError]}
                placeholder={mode === 'create' ? 'Initial password' : 'Leave blank to keep current'}
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={formData.password}
                onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
              />
              {errors.password && <AppText style={styles.formError}>{errors.password}</AppText>}
            </View>

            <AppText style={[styles.formLabel, { marginTop: 10, marginBottom: 12 }]}>Capabilities</AppText>

            <View style={[styles.formGroup, { gap: 12 }]}>
              <View style={styles.switchRow}>
                <AppText style={styles.switchLabel}>Can Register Schools</AppText>
                <Switch
                  value={formData.can_register_school}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, can_register_school: val }))}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={Platform.OS === 'android' ? Theme.colors.card : undefined}
                />
              </View>

              <View style={styles.switchRow}>
                <AppText style={styles.switchLabel}>Can View Payments</AppText>
                <Switch
                  value={formData.can_view_payments}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, can_view_payments: val }))}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={Platform.OS === 'android' ? Theme.colors.card : undefined}
                />
              </View>

              <View style={styles.switchRow}>
                <AppText style={styles.switchLabel}>Can Edit School Features</AppText>
                <Switch
                  value={formData.can_edit_features}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, can_edit_features: val }))}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={Platform.OS === 'android' ? Theme.colors.card : undefined}
                />
              </View>

              {mode === 'edit' && (
                <View style={styles.switchRow}>
                  <AppText style={styles.switchLabel}>Account Active</AppText>
                  <Switch
                    value={formData.is_active}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, is_active: val }))}
                    trackColor={{ false: colors.border, true: colors.accent }}
                    thumbColor={Platform.OS === 'android' ? Theme.colors.card : undefined}
                  />
                </View>
              )}
            </View>
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

// Agent Management Modal
const AgentManagementModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<Agent | null>(null);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllAgents();
      setAgents(data);
    } catch (err) {
      console.error('Failed to load agents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchAgents();
    }
  }, [visible]);

  const handleToggleStatus = async (agent: Agent) => {
    try {
      await adminService.toggleAgentStatus(agent.id, !agent.is_active);
      Alert.alert('Success', 'Agent status updated successfully');
      fetchAgents();
    } catch (err) {
      Alert.alert('Error', 'Failed to update agent status');
    }
  };

  const filteredAgents = useMemo(() => {
    if (!searchTerm.trim()) {return agents;}
    const q = searchTerm.toLowerCase();
    return agents.filter(a =>
      (a.full_name || '').toLowerCase().includes(q) ||
      (a.username || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q)
    );
  }, [agents, searchTerm]);

  const getInitials = (name: string) => {
    if (!name) {return 'A';}
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <View style={styles.screenContainer}>
      <StandardPageHeader title="Marketing Agents" onBackPress={() => {}} />

      {/* Search Bar & Register Btn */}
      <View style={{ paddingHorizontal: Theme.spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.surface }}>
        <View style={styles.searchContainer}>
          <Search size={16} color={colors.textMuted} style={{ marginRight: Theme.spacing.sm }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search agents..."
            placeholderTextColor={colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity accessibilityRole="button" onPress={() => setSearchTerm('')} style={styles.clearBtn}>
              <X size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity accessibilityRole="button"
          style={{
            backgroundColor: colors.primary,
            height: 40,
            paddingHorizontal: Theme.spacing.md,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          }}
          onPress={() => {
            setFormMode('create');
            setEditTarget(null);
            setFormModalOpen(true);
          }}
        >
          <Plus size={16} color={Theme.colors.card} />
          <AppText style={{ color: Theme.colors.card, fontWeight: '700', fontSize: 13 }}>Register</AppText>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Theme.spacing.md, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ marginTop: 40 }}><Loader /></View>
        ) : filteredAgents.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Users size={40} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 12 }} />
            <AppText style={{ ...Theme.typography.body, color: colors.textMuted }}>No agents found</AppText>
          </View>
        ) : (
          filteredAgents.map(agent => (
            <View key={agent.id} style={styles.agentCard}>
              <View style={styles.cardInfoRow}>
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                  <AppText style={styles.avatarText}>{getInitials(agent.full_name)}</AppText>
                </View>

                {/* Info Column */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppText style={styles.agentName}>{agent.full_name}</AppText>
                    <View style={[
                      styles.statusBadge,
                      agent.is_active ? { backgroundColor: colors.successSoft } : { backgroundColor: colors.errorSoft },
                    ]}>
                      <AppText style={[
                        styles.statusText,
                        { color: agent.is_active ? colors.success : colors.error },
                      ]}>
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </AppText>
                    </View>
                  </View>
                  <AppText style={styles.agentUsername}>@{agent.username}</AppText>

                  <View style={styles.emailRow}>
                    <Mail size={12} color={colors.textMuted} style={{ marginRight: Theme.spacing.xs }} />
                    <AppText style={styles.agentEmail}>{agent.email}</AppText>
                  </View>
                </View>

                {/* Edit Button */}
                <TouchableOpacity accessibilityRole="button"
                  style={styles.agentEditBtn}
                  onPress={() => {
                    setFormMode('edit');
                    setEditTarget(agent);
                    setFormModalOpen(true);
                  }}
                >
                  <Edit2 size={13} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Capabilities Row */}
              <View style={styles.capabilitiesWrapper}>
                <AppText style={styles.capTitle}>Permissions:</AppText>
                <View style={styles.capabilitiesContainer}>
                  {agent.can_register_school ? (
                    <View style={[styles.capTag, { backgroundColor: colors.successSoft }]}>
                      <AppText style={[styles.capTagText, { color: colors.success }]}>Register Schools</AppText>
                    </View>
                  ) : (
                    <View style={[styles.capTag, { backgroundColor: Theme.colors.background }]}>
                      <AppText style={[styles.capTagText, { color: colors.textMuted, textDecorationLine: 'line-through' }]}>Register Schools</AppText>
                    </View>
                  )}

                  {agent.can_view_payments ? (
                    <View style={[styles.capTag, { backgroundColor: '#e0f2fe' }]}>
                      <AppText style={[styles.capTagText, { color: '#0369a1' }]}>View Payments</AppText>
                    </View>
                  ) : (
                    <View style={[styles.capTag, { backgroundColor: Theme.colors.background }]}>
                      <AppText style={[styles.capTagText, { color: colors.textMuted, textDecorationLine: 'line-through' }]}>View Payments</AppText>
                    </View>
                  )}

                  {agent.can_edit_features ? (
                    <View style={[styles.capTag, { backgroundColor: '#f3e8ff' }]}>
                      <AppText style={[styles.capTagText, { color: '#6b21a8' }]}>Edit Features</AppText>
                    </View>
                  ) : (
                    <View style={[styles.capTag, { backgroundColor: Theme.colors.background }]}>
                      <AppText style={[styles.capTagText, { color: colors.textMuted, textDecorationLine: 'line-through' }]}>Edit Features</AppText>
                    </View>
                  )}
                </View>
              </View>

              {/* Toggle Status Button */}
              <View style={styles.cardActionsRow}>
                <TouchableOpacity accessibilityRole="button"
                  style={[
                    styles.statusToggleBtn,
                    agent.is_active ? styles.btnDeactivate : styles.btnActivate,
                  ]}
                  onPress={() => handleToggleStatus(agent)}
                >
                  <Power size={13} color={agent.is_active ? colors.error : colors.success} style={{ marginRight: 6 }} />
                  <AppText style={[
                    styles.actionBtnText,
                    { color: agent.is_active ? colors.error : colors.success },
                  ]}>
                    {agent.is_active ? 'Deactivate Agent' : 'Activate Agent'}
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <AgentFormModal
        visible={formModalOpen}
        mode={formMode}
        initialData={editTarget}
        onClose={() => setFormModalOpen(false)}
        onSuccess={fetchAgents}
      />
    </View>
  );
};


export default function AdminAgentsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screenContainer, { paddingTop: 0, paddingBottom: 0 }]}>

      <AgentManagementModal visible={true} onClose={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { ...Theme.typography.h3, color: colors.textPrimary },
  modalClose: { padding: Theme.spacing.xs },
  modalBody: { padding: 20 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  formGroup: { marginBottom: Theme.spacing.md },
  formLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  formInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, ...Theme.typography.body, color: colors.textPrimary },
  formInputError: { borderColor: colors.error },
  formError: { ...Theme.typography.label, color: colors.error, marginTop: Theme.spacing.xs },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { ...Theme.typography.body, color: colors.textPrimary },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, height: 40, flex: 1 },
  searchInput: { flex: 1, ...Theme.typography.body, color: colors.textPrimary, padding: 0 },
  clearBtn: { padding: Theme.spacing.xs },
  agentCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.background,
    borderRadius: 16,
    padding: Theme.spacing.md,
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(30, 58, 138, 0.15)',
  },
  avatarText: {
    ...Theme.typography.body,
    fontWeight: 'bold',
    color: colors.primary,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  agentUsername: {
    ...Theme.typography.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.xs,
  },
  agentEmail: {
    ...Theme.typography.caption,
    color: colors.textMuted,
  },
  agentEditBtn: {
    padding: Theme.spacing.sm,
    backgroundColor: 'rgba(30, 58, 138, 0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 138, 0.1)',
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  capabilitiesWrapper: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.background,
  },
  capTitle: {
    ...Theme.typography.label,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  capabilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  capTag: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 6,
  },
  capTagText: {
    ...Theme.typography.label,
    fontWeight: '600',
  },
  cardActionsRow: {
    marginTop: 14,
  },
  statusToggleBtn: {
    width: '100%',
    height: 36,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnDeactivate: {
    borderColor: colors.errorSoft,
    backgroundColor: colors.errorSoft,
  },
  btnActivate: {
    borderColor: colors.successSoft,
    backgroundColor: colors.successSoft,
  },
  actionBtnText: {
    ...Theme.typography.caption,
    fontWeight: '700',
  },
});
