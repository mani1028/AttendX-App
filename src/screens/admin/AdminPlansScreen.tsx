import { useNavigation } from '@react-navigation/native';
import { Theme } from '../../theme/tokens';
import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, Switch, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, Plus, Edit2, ClipboardList, Trash2, CreditCard } from 'lucide-react-native';
import * as adminService from '../../services/adminService';
import { colors } from '../../theme/tokens';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import Loader from '../../components/common/Loader';
import { formatErrorMessage } from '../../utils/helpers';
import { formatStoredPriceDisplay } from '../../utils/pricingPlans';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { adminPlansStyles as styles } from '../../components/admin/adminPlans/adminPlansStyles';

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
    if (!formData.plan_code.trim()) {newErrors.plan_code = 'Plan code is required';}
    if (!formData.title.trim()) {newErrors.title = 'Title is required';}
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {return;}
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

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: Theme.spacing.xl }}>
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

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: Theme.spacing.xl }}>
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

            <View style={[styles.formGroup, { gap: Theme.spacing.md }]}>
              <View style={styles.switchRow}>
                <AppText style={styles.switchLabel}>Active (Show to schools)</AppText>
                <Switch
                  value={formData.active}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, active: val }))}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={Platform.OS === 'android' ? Theme.colors.card : undefined}
                />
              </View>

              <View style={styles.switchRow}>
                <AppText style={styles.switchLabel}>Highlighted (Featured)</AppText>
                <Switch
                  value={formData.highlighted}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, highlighted: val }))}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={Platform.OS === 'android' ? Theme.colors.card : undefined}
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

const handleAdminTabBack = (navigation: ReturnType<typeof useNavigation>) => {
  const nav = navigation as any;
  if (nav.canGoBack?.()) {
    nav.goBack();
    return;
  }
  nav.navigate('Dashboard');
};

// Plans Management Modal
const PlansManagementModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const navigation = useNavigation();
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
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load pricing plans');
      console.warn('[Plans] load failed:', err?.message || err);
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
        },
      },
    ]);
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
          title="Pricing Plans"
          onBackPress={() => handleAdminTabBack(navigation)}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
      <View style={{ paddingVertical: Theme.spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, marginBottom: Theme.spacing.md }}>
        <TouchableOpacity accessibilityRole="button"
          style={{
            backgroundColor: colors.primary,
            height: 40,
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
          <AppText style={{ color: Theme.colors.card, fontWeight: '700', fontSize: Theme.typography.caption.fontSize }}>Add Pricing Plan</AppText>
        </TouchableOpacity>
      </View>

        {loading ? (
          <View style={{ marginTop: 40 }}><Loader /></View>
        ) : plans.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <CreditCard size={40} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: Theme.spacing.md }} />
            <AppText style={{ ...Theme.typography.body, color: colors.textMuted }}>No plans found</AppText>
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
                      <View style={{ flexDirection: 'row', gap: Theme.spacing.xs }}>
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

                  <View style={{ flexDirection: 'row', gap: Theme.spacing.sm }}>
                    <TouchableOpacity accessibilityRole="button"
                      style={styles.planEditBtn}
                      onPress={() => {
                        setFormMode('edit');
                        setEditTarget(plan);
                        setFormModalOpen(true);
                      }}
                    >
                      <Edit2 size={13} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button"
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
                    <AppText style={styles.priceValue}>{formatStoredPriceDisplay(plan.monthly_price)}</AppText>
                  </View>
                  <View style={styles.limitItem}>
                    <AppText style={styles.priceLabel}>Yearly</AppText>
                    <AppText style={styles.priceValue}>{formatStoredPriceDisplay(plan.yearly_price)}</AppText>
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
        </View>
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
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screenContainer, { paddingTop: 0, paddingBottom: 0 }]}>

      <PlansManagementModal visible={true} onClose={() => {}} />
    </View>
  );
}
