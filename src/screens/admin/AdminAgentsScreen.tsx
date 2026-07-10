import { useNavigation } from '@react-navigation/native';
import { Theme } from '../../theme/tokens';
import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, Switch, Platform, Modal, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, Plus, Edit2, Users, Mail, Power } from 'lucide-react-native';
import * as adminService from '../../services/adminService';
import { colors } from '../../theme/tokens';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import Loader from '../../components/common/Loader';
import { formatErrorMessage } from '../../utils/helpers';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { adminAgentsStyles as styles } from '../../components/admin/adminAgents/adminAgentsStyles';

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
  const insets = useSafeAreaInsets();
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

          <ScrollView
            style={styles.modalBodyScroll}
            contentContainerStyle={styles.modalBodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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

            <AppText style={[styles.formLabel, { marginTop: 10, marginBottom: Theme.spacing.md }]}>Capabilities</AppText>

            <View style={[styles.formGroup, { gap: Theme.spacing.md }]}>
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

          <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={{ flex: 1 }}>
              <AppButton title="Cancel" onPress={onClose} type="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton title={saving ? 'Saving...' : 'Save'} onPress={handleSave} disabled={saving} />
            </View>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        showsVerticalScrollIndicator={false}
      >
        <StandardPageHeader
          scrollWithContent
          title="Marketing Agents"
          showBack={false}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
      <View style={{ paddingVertical: Theme.spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.surface, marginBottom: Theme.spacing.md }}>
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
            borderRadius: Theme.radius.sm,
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
          <AppText style={{ color: Theme.colors.card, fontWeight: '700', fontSize: Theme.typography.caption.fontSize }}>Register</AppText>
        </TouchableOpacity>
      </View>

        {loading ? (
          <View style={{ marginTop: 40 }}><Loader /></View>
        ) : filteredAgents.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Users size={40} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: Theme.spacing.md }} />
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
                <View style={{ flex: 1, marginLeft: Theme.spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm }}>
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
                    <View style={[styles.capTag, { backgroundColor: Theme.colors.skyLight }]}>
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
        </View>
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
