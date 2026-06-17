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
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, Plus, Edit2, ClipboardList, Trash2, CreditCard } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import * as adminService from '../../services/adminService';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import Loader from '../../components/common/Loader';
import { formatErrorMessage } from '../../utils/helpers';

// Pricing Plan Interface
interface Plan {
  id: string;
  plan_code: string;
  title: string;
  description: string;
  monthly_price: string;
  yearly_price: string;
  active: boolean;
  highlighted: boolean;
  max_branches: number;
  media_retention_days: number;
}

// Plan Edit / Create Modal
const PlanFormModal: React.FC<{
  visible: boolean;
  mode: 'create' | 'edit';
  initialData?: Plan | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ visible, mode, initialData, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    plan_code: '',
    title: '',
    description: '',
    monthly_price: '',
    yearly_price: '',
    active: false,
    highlighted: false,
    max_branches: 1,
    media_retention_days: 0,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible && mode === 'edit' && initialData) {
      setFormData({
        plan_code: initialData.plan_code,
        title: initialData.title,
        description: initialData.description,
        monthly_price: String(initialData.monthly_price || ''),
        yearly_price: String(initialData.yearly_price || ''),
        active: initialData.active,
        highlighted: initialData.highlighted,
        max_branches: initialData.max_branches || 1,
        media_retention_days: initialData.media_retention_days || 0,
      });
    } else if (visible && mode === 'create') {
      setFormData({
        plan_code: '',
        title: '',
        description: '',
        monthly_price: '',
        yearly_price: '',
        active: false,
        highlighted: false,
        max_branches: 1,
        media_retention_days: 0,
      });
    }
    setErrors({});
  }, [visible, mode, initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.plan_code.trim()) newErrors.plan_code = 'Plan code is required';
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (mode === 'create') {
        await adminService.createPlan(formData);
        Alert.alert('Success', 'Pricing plan created successfully');
      } else {
        await adminService.updatePlan(initialData?.id || '', formData);
        Alert.alert('Success', 'Pricing plan updated successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to save pricing plan');
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
              {mode === 'create' ? 'Create Pricing Plan' : 'Edit Pricing Plan'}
            </AppText>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <AppText style={styles.formLabel}>Plan Code</AppText>
              <TextInput
                style={[styles.formInput, errors.plan_code && styles.formInputError]}
                placeholder="e.g. starter"
                placeholderTextColor={colors.textMuted}
                value={formData.plan_code}
                onChangeText={(text) => setFormData(prev => ({ ...prev, plan_code: text }))}
              />
              {errors.plan_code && <AppText style={styles.formError}>{errors.plan_code}</AppText>}
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.formLabel}>Plan Title</AppText>
              <TextInput
                style={[styles.formInput, errors.title && styles.formInputError]}
                placeholder="e.g. Pro Attendance"
                placeholderTextColor={colors.textMuted}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              />
              {errors.title && <AppText style={styles.formError}>{errors.title}</AppText>}
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.formLabel}>Description</AppText>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Details about the plan..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <AppText style={styles.formLabel}>Monthly Price</AppText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. ₹599"
                  placeholderTextColor={colors.textMuted}
                  value={formData.monthly_price}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, monthly_price: text }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.formLabel}>Yearly Price</AppText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. ₹499"
                  placeholderTextColor={colors.textMuted}
                  value={formData.yearly_price}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, yearly_price: text }))}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <AppText style={styles.formLabel}>Max Branches</AppText>
                <TextInput
                  style={styles.formInput}
                  placeholder="1"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={String(formData.max_branches)}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, max_branches: parseInt(text) || 1 }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.formLabel}>Media Retention (Days)</AppText>
                <TextInput
                  style={styles.formInput}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={String(formData.media_retention_days)}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, media_retention_days: parseInt(text) || 0 }))}
                />
              </View>
            </View>

            <View style={[styles.formGroup, { gap: 12 }]}>
              <View style={styles.switchRow}>
                <AppText style={styles.switchLabel}>Active (Show to schools)</AppText>
                <Switch
                  value={formData.active}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, active: val }))}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                />
              </View>

              <View style={styles.switchRow}>
                <AppText style={styles.switchLabel}>Highlighted (Featured)</AppText>
                <Switch
                  value={formData.highlighted}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, highlighted: val }))}
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
              <AppButton title={saving ? 'Saving...' : 'Save'} onPress={handleSave} disabled={saving} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Plans Management Modal
const PlansManagementModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<Plan | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllPlans();
      setPlans(data);
    } catch (err) {
      console.error('Failed to load plans', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchPlans();
    }
  }, [visible]);

  const handleDeletePlan = async (id: string) => {
    Alert.alert('Delete Plan', 'Are you sure you want to delete this pricing plan?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.deletePlan(id);
            Alert.alert('Success', 'Plan deleted successfully');
            fetchPlans();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete plan');
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.screenContainer}>
      <LinearGradient 
        colors={['#1E3A8A', '#3B82F6']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={{ paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}
      >
        <View style={{ flex: 1 }}>
          <AppText style={{ color: '#FFF', fontSize: 22, fontWeight: '800' }}>Pricing Plans</AppText>
          <AppText style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>Manage plans and access configurations</AppText>
        </View>
      </LinearGradient>

      {/* Add Plan Btn */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            height: 40,
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
          <Plus size={16} color="#fff" />
          <AppText style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Add Pricing Plan</AppText>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ marginTop: 40 }}><Loader /></View>
        ) : plans.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <CreditCard size={40} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 12 }} />
            <AppText style={{ fontSize: 14, color: colors.textMuted }}>No plans found</AppText>
          </View>
        ) : (
          plans.map(plan => {
            // Pick border highlight color based on active / featured
            const cardLeftBorderColor = plan.highlighted 
              ? colors.warning 
              : plan.active 
                ? colors.success 
                : colors.border;
            
            return (
              <View key={plan.id} style={[styles.planCard, { borderLeftColor: cardLeftBorderColor, borderLeftWidth: 4 }]}>
                <View style={styles.planCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <AppText style={styles.planName}>{plan.title}</AppText>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {plan.active && (
                          <View style={[styles.statusBadge, { backgroundColor: colors.successSoft }]}>
                            <AppText style={[styles.statusText, { color: colors.success }]}>Active</AppText>
                          </View>
                        )}
                        {plan.highlighted && (
                          <View style={[styles.statusBadge, { backgroundColor: colors.warningSoft }]}>
                            <AppText style={[styles.statusText, { color: colors.warning }]}>Featured</AppText>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.planCodeBadge}>
                      <AppText style={styles.planCodeText}>CODE: {plan.plan_code.toUpperCase()}</AppText>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={styles.planEditBtn}
                      onPress={() => {
                        setFormMode('edit');
                        setEditTarget(plan);
                        setFormModalOpen(true);
                      }}
                    >
                      <Edit2 size={13} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.planDeleteBtn}
                      onPress={() => handleDeletePlan(plan.id)}
                    >
                      <Trash2 size={13} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                <AppText style={styles.planDesc}>{plan.description || 'No description available for this pricing plan.'}</AppText>
                
                <View style={styles.planLimits}>
                  <View style={styles.limitItem}>
                    <AppText style={styles.priceLabel}>Monthly</AppText>
                    <AppText style={styles.priceValue}>₹{plan.monthly_price || '0'}</AppText>
                  </View>
                  <View style={styles.limitItem}>
                    <AppText style={styles.priceLabel}>Yearly</AppText>
                    <AppText style={styles.priceValue}>₹{plan.yearly_price || '0'}</AppText>
                  </View>
                  <View style={styles.limitItem}>
                    <AppText style={styles.priceLabel}>Branches</AppText>
                    <AppText style={styles.priceValue}>{plan.max_branches} {plan.max_branches === 1 ? 'Branch' : 'Branches'}</AppText>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <PlanFormModal
        visible={formModalOpen}
        mode={formMode}
        initialData={editTarget}
        onClose={() => setFormModalOpen(false)}
        onSuccess={fetchPlans}
      />
    </View>
  );
};


export default function AdminPlansScreen() {
  return (
    <View style={[styles.screenContainer, { paddingTop: 0, paddingBottom: 0 }]}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
      <PlansManagementModal visible={true} onClose={() => {}} />
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
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  modalClose: { padding: 4 },
  modalBody: { padding: 20 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  formInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 14, color: colors.textPrimary },
  formInputError: { borderColor: colors.error },
  formError: { fontSize: 11, color: colors.error, marginTop: 4 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: 14, color: colors.textPrimary },
  textArea: { height: 60, textAlignVertical: 'top' },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  planCodeBadge: {
    backgroundColor: 'rgba(30, 58, 138, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 138, 0.1)',
  },
  planCodeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  planEditBtn: {
    padding: 8,
    backgroundColor: 'rgba(30, 58, 138, 0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 138, 0.1)',
  },
  planDeleteBtn: {
    padding: 8,
    backgroundColor: colors.errorSoft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.1)',
  },
  planDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 10,
    lineHeight: 18,
  },
  planLimits: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  limitItem: {
    alignItems: 'center',
    flex: 1,
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
  },
});
