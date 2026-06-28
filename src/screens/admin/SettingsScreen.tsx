import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import { Theme } from '../../theme/tokens';
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Switch, Modal, TextInput, Platform, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, CreditCard, ShieldCheck, Bell, Settings, Trash2, AlertTriangle, X, CheckCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/tokens';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import API from '../../services/api';
import * as adminService from '../../services/adminService';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';

interface School {
  id: string;
  school_id: string;
  name: string;
  email: string;
}

// Secure Delete Modal
const SecureDeleteModal: React.FC<{
  visible: boolean;
  schools?: School[];
  onClose: () => void;
  onDeleteSuccess: () => void;
}> = ({ visible, onClose, onDeleteSuccess }) => {
  const [schoolId, setSchoolId] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Input, 2: Confirmation, 3: Success Complete
  const [confirmationText, setConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deletedSchool, setDeletedSchool] = useState<{
    school_id: string;
    school_name: string;
    schema_dropped: string;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setSchoolId('');
    setPassword('');
    setConfirmationText('');
    setStep(1);
    setDeletedSchool(null);
    setLoading(false);
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleVerifySchool = async () => {
    if (!schoolId.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter school ID and super admin password');
      return;
    }

    setLoading(true);
    try {
      await adminService.verifySuperAdminPassword(schoolId.trim().toUpperCase(), password);
      setStep(2);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.message || 'Invalid super admin password or school ID';
      Alert.alert('Verification Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchool = async () => {
    const expectedConfirmation = `DELETE_${schoolId.trim().toUpperCase()}`;
    if (confirmationText !== expectedConfirmation) {
      Alert.alert('Error', `Please type "${expectedConfirmation}" to confirm`);
      return;
    }

    setLoading(true);
    try {
      const result = await adminService.deleteSchoolComplete(schoolId.trim().toUpperCase(), password, confirmationText);
      setDeletedSchool({
        school_id: result.school_id || schoolId.trim().toUpperCase(),
        school_name: result.school_name || 'School Deleted',
        schema_dropped: result.schema_dropped || 'Schema Dropped',
      });
      setStep(3);
      onDeleteSuccess();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.message || 'Failed to delete school';
      Alert.alert('Deletion Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const expectedConfirmation = `DELETE_${schoolId.trim().toUpperCase()}`;
  const isConfirmationValid = confirmationText === expectedConfirmation;
  const canProceed = schoolId.trim() && password.trim() && isConfirmationValid && step === 2;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <AppText style={[styles.modalTitle, { color: colors.error }]} weight="bold">School Deletion</AppText>
              <AppText style={{ ...Theme.typography.caption, color: colors.textMuted }}>Permanently delete a school and all associated data</AppText>
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={handleClose} style={styles.modalClose}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={[styles.modalBody, innerPageLayoutStyles.scrollViewFront]} contentContainerStyle={{ paddingBottom: Theme.spacing.lg }}>
            {step === 1 && (
              <View style={{ gap: 16 }}>
                <View style={[styles.warningBanner, { backgroundColor: colors.errorSoft, borderColor: colors.errorSoft }]}>
                  <AlertTriangle size={18} color={colors.error} />
                  <AppText style={{ color: colors.error, ...Theme.typography.caption, fontWeight: '700', flex: 1 }}>
                    ⚠️ Warning: This action cannot be undone. The school and ALL associated data (students, teachers, attendance records, etc.) will be permanently deleted from the database.
                  </AppText>
                </View>

                <View style={styles.formGroup}>
                  <AppText style={styles.formLabel}>School ID</AppText>
                  <TextInput
                    style={styles.formInput}
                    value={schoolId}
                    onChangeText={text => setSchoolId(text.toUpperCase())}
                    placeholder="Enter school ID to delete (e.g. SSC1000)"
                    placeholderTextColor={colors.textMuted}
                    editable={!loading}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.formGroup}>
                  <AppText style={styles.formLabel}>Super Admin Password</AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput
                      style={[styles.formInput, { flex: 1, paddingRight: 50 }]}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter super admin password"
                      placeholderTextColor={colors.textMuted}
                      editable={!loading}
                    />
                    <TouchableOpacity accessibilityRole="button"
                      onPress={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: 12 }}
                    >
                      <AppText style={{ ...Theme.typography.caption, color: colors.primary, fontWeight: '700' }}>
                        {showPassword ? 'Hide' : 'Show'}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>

                <AppButton
                  title={loading ? 'Verifying...' : 'Continue to Confirmation'}
                  onPress={handleVerifySchool}
                  disabled={!schoolId || !password || loading}
                />
              </View>
            )}

            {step === 2 && (
              <View style={{ gap: 16 }}>
                <View style={[styles.warningBanner, { backgroundColor: colors.errorSoft, borderColor: colors.errorSoft }]}>
                  <AlertTriangle size={18} color={colors.error} />
                  <AppText style={{ color: colors.error, ...Theme.typography.caption, fontWeight: '700', flex: 1 }}>
                    CRITICAL: Final confirmation required for school ID: {schoolId}. This is your final chance to prevent permanent data loss.
                  </AppText>
                </View>

                <View style={styles.formGroup}>
                  <AppText style={styles.formLabel}>Type this to confirm deletion:</AppText>
                  <View style={{ backgroundColor: Theme.colors.background, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: Theme.spacing.sm }}>
                    <AppText style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', ...Theme.typography.body, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center' }}>
                      {expectedConfirmation}
                    </AppText>
                  </View>
                  <TextInput
                    style={[styles.formInput, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', borderColor: isConfirmationValid ? colors.success : colors.border }]}
                    value={confirmationText}
                    onChangeText={text => setConfirmationText(text.toUpperCase())}
                    placeholder="Type the confirmation text exactly"
                    placeholderTextColor={colors.textMuted}
                    editable={!loading}
                    autoCapitalize="characters"
                    autoComplete="off"
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      title="Back"
                      onPress={() => setStep(1)}
                      type="secondary"
                      disabled={loading}
                    />
                  </View>
                  <View style={{ flex: 2 }}>
                    <AppButton
                      title={loading ? 'Deleting...' : 'Permanently Delete School'}
                      onPress={handleDeleteSchool}
                      disabled={!canProceed || loading}
                      type="primary"
                    />
                  </View>
                </View>
              </View>
            )}

            {step === 3 && (
              <View style={{ gap: 16, alignItems: 'center', paddingVertical: 20 }}>
                <View style={[styles.deleteIconWrap, { backgroundColor: colors.successSoft }]}>
                  <CheckCircle size={32} color={colors.success} />
                </View>
                <AppText style={styles.modalTitle} weight="bold">Deletion Complete</AppText>
                <AppText style={{ color: colors.textMuted, textAlign: 'center', ...Theme.typography.body }}>
                  The school and all associated data have been successfully deleted.
                </AppText>

                {deletedSchool && (
                  <View style={styles.deletedDetailsCard}>
                    <AppText style={styles.deletedDetailsText}>
                      <AppText weight="bold" style={{ color: colors.textPrimary }}>School: </AppText>
                      {deletedSchool.school_name}
                    </AppText>
                    <AppText style={styles.deletedDetailsText}>
                      <AppText weight="bold" style={{ color: colors.textPrimary }}>ID: </AppText>
                      {deletedSchool.school_id}
                    </AppText>
                    <AppText style={styles.deletedDetailsText}>
                      <AppText weight="bold" style={{ color: colors.textPrimary }}>Schema: </AppText>
                      {deletedSchool.schema_dropped}
                    </AppText>
                  </View>
                )}

                <View style={{ width: '100%', marginTop: Theme.spacing.sm }}>
                  <AppButton
                    title="Delete Another School"
                    onPress={resetForm}
                    type="primary"
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};


export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [secureDeleteModalOpen, setSecureDeleteModalOpen] = useState(false);

  // Local notification toggle
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Global Super Admin settings toggles
  const [enableAutoPay, setEnableAutoPay] = useState(true);
  const [enablePromotion, setEnablePromotion] = useState(true);

  const { setTabBarVisible } = useAuth();
  useEffect(() => {
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [setTabBarVisible]);

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleScroll = useScrollTabBar();


  const loadSettingsData = async () => {
    try {
      setLoading(true);

      const schoolsData = await adminService.getAllSchools();
      setSchools(schoolsData);

      // Load local notification settings
      const localNotif = await AsyncStorage.getItem('push_notifications_enabled');
      if (localNotif !== null) {
        setNotificationsEnabled(localNotif === 'true');
      }

      // Fetch global settings from backend
      const res = await API.get('/pricing/admin/settings');
      if (res.data) {
        setEnableAutoPay(res.data.enable_auto_pay === 'true' || res.data.enable_auto_pay === true);
        setEnablePromotion(res.data.enable_promotion !== 'false' && res.data.enable_promotion !== false);
      }
    } catch (err) {
      console.error('Failed to load settings data', err);
      // Suppress alert on first load if server is temporarily unreachable, but log it
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('Dashboard');
    }
  };

  const togglePushNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    try {
      await AsyncStorage.setItem('push_notifications_enabled', String(value));
    } catch (e) {
      console.error('Failed to save push notification setting', e);
    }
  };

  const updateGlobalSetting = async (key: string, value: boolean) => {
    setSaving(true);
    // Optimistically update
    if (key === 'enable_auto_pay') {setEnableAutoPay(value);}
    if (key === 'enable_promotion') {setEnablePromotion(value);}

    try {
      await API.post('/pricing/admin/settings', {
        [key]: value ? 'true' : 'false',
      });
    } catch (err) {
      console.error(`Failed to update ${key}`, err);
      Alert.alert('Error', 'Failed to update system setting. Reverting...');
      // Revert state
      if (key === 'enable_auto_pay') {setEnableAutoPay(!value);}
      if (key === 'enable_promotion') {setEnablePromotion(!value);}
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>


      <StandardPageHeader title="Settings" onBackPress={() => navigation.goBack()} />

      <ScrollView
       style={{ flex: 1 }}
        contentContainerStyle={[styles.contentContainer]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Payment & Billing Toggles */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CreditCard size={20} color={colors.accent} />
            <AppText style={styles.cardTitle}>Payment & Billing</AppText>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <AppText style={styles.rowText}>Auto-Renewal Visibility</AppText>
              <AppText style={styles.helperText}>
                Show or hide the "Automatic Renewal" card on school renewal page.
              </AppText>
            </View>
            <Switch
              value={enableAutoPay}
              onValueChange={(val) => updateGlobalSetting('enable_auto_pay', val)}
              disabled={saving}
              trackColor={{ false: false ? colors.border : undefined, true: colors.accent }}
              thumbColor={Theme.colors.card}
            />
          </View>
        </View>

        {/* Global Access Toggles */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ShieldCheck size={20} color={colors.success} />
            <AppText style={styles.cardTitle}>Global Feature Access</AppText>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <AppText style={styles.rowText}>Enable Student Promotion</AppText>
              <AppText style={styles.helperText}>
                Show or hide the Promotion action on all principal dashboards.
              </AppText>
            </View>
            <Switch
              value={enablePromotion}
              onValueChange={(val) => updateGlobalSetting('enable_promotion', val)}
              disabled={saving}
              trackColor={{ false: false ? colors.border : undefined, true: colors.accent }}
              thumbColor={Theme.colors.card}
            />
          </View>
        </View>

        {/* Local Settings */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Bell size={20} color={colors.warning} />
            <AppText style={styles.cardTitle}>Local Preferences</AppText>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <AppText style={styles.rowText}>Push Notifications</AppText>
              <AppText style={styles.helperText}>
                Receive admin alerts, school onboarding reports, and sync status on this device.
              </AppText>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={togglePushNotifications}
              trackColor={{ false: false ? colors.border : undefined, true: colors.accent }}
              thumbColor={Theme.colors.card}
            />
          </View>
        </View>

        {/* Danger Zone Section */}
        <AppCard style={styles.dangerZoneCard}>
          <AppText style={styles.dangerZoneTitle}>Danger Zone</AppText>
          <AppText style={styles.dangerZoneSub}>Actions here require super admin password verification and are permanent.</AppText>
          <TouchableOpacity accessibilityRole="button"
            style={styles.dangerZoneActionBtn}
            onPress={() => setSecureDeleteModalOpen(true)}
            activeOpacity={0.7}
          >
            <Trash2 size={18} color={Theme.colors.card} />
            <AppText style={styles.dangerZoneActionBtnText}>Delete Registered School</AppText>
          </TouchableOpacity>
        </AppCard>
      </ScrollView>

      <SecureDeleteModal
        visible={secureDeleteModalOpen}
        schools={schools}
        onClose={() => setSecureDeleteModalOpen(false)}
        onDeleteSuccess={() => {
          loadSettingsData();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  headerStandard: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.card,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: Theme.spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowText: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  helperText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  dangerZoneCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 20,
    borderColor: '#fecaca',
    borderWidth: 1.5,
    padding: Theme.spacing.md,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginTop: 20,
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.error,
    marginBottom: Theme.spacing.xs,
  },
  dangerZoneSub: {
    ...Theme.typography.caption,
    color: colors.textMuted,
    marginBottom: Theme.spacing.md,
    lineHeight: 18,
  },
  dangerZoneActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.error,
    paddingVertical: 12,
    borderRadius: 12,
  },
  dangerZoneActionBtnText: {
    color: Theme.colors.card,
    ...Theme.typography.body,
    fontWeight: '700',
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
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    ...Theme.typography.label,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: Theme.spacing.sm,
    letterSpacing: 0.5,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    ...Theme.typography.bodyMd,
    backgroundColor: Theme.colors.background,
    color: colors.textPrimary,
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
  deleteIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
  },
  deletedDetailsCard: {
    backgroundColor: Theme.colors.card,
    padding: Theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    marginVertical: 12,
    gap: 8,
  },
  deletedDetailsText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
