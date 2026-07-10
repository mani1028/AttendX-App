import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import { Theme } from '../../theme/tokens';
import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Switch, Modal, TextInput, Platform, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useTabBarScrollPadding } from '../../hooks/useTabBarScrollPadding';
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
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import { settingsStyles as styles } from '../../components/admin/settings/settingsStyles';

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
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
              <View style={{ gap: Theme.spacing.md }}>
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
              <View style={{ gap: Theme.spacing.md }}>
                <View style={[styles.warningBanner, { backgroundColor: colors.errorSoft, borderColor: colors.errorSoft }]}>
                  <AlertTriangle size={18} color={colors.error} />
                  <AppText style={{ color: colors.error, ...Theme.typography.caption, fontWeight: '700', flex: 1 }}>
                    CRITICAL: Final confirmation required for school ID: {schoolId}. This is your final chance to prevent permanent data loss.
                  </AppText>
                </View>

                <View style={styles.formGroup}>
                  <AppText style={styles.formLabel}>Type this to confirm deletion:</AppText>
                  <View style={{ backgroundColor: Theme.colors.background, padding: Theme.spacing.md, borderRadius: Theme.radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: Theme.spacing.sm }}>
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

                <View style={{ flexDirection: 'row', gap: Theme.spacing.md }}>
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
              <View style={{ gap: Theme.spacing.md, alignItems: 'center', paddingVertical: Theme.spacing.xl }}>
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
  const tabBarScrollPadding = useTabBarScrollPadding();
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
        <ScreenSkeleton variant="list" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[innerPageLayoutStyles.scrollPageContent, { paddingBottom: tabBarScrollPadding }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <StandardPageHeader
          scrollWithContent
          title="Settings"
          onBackPress={() => navigation.goBack()}
          showBack={false}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />

        <View style={[innerPageLayoutStyles.scrollBody, styles.contentContainer]}>
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
        </View>
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
