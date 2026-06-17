settings_code = """import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator, Switch, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, CreditCard, ShieldCheck, Bell, Settings, Trash2, AlertTriangle, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import API from '../../services/api';
import * as adminService from '../../services/adminService';

interface School {
  id: string;
  school_id: string;
  name: string;
  email: string;
}

// Secure Delete Modal
const SecureDeleteModal: React.FC<{
  visible: boolean;
  schools: School[];
  onClose: () => void;
  onDeleteSuccess: () => void;
}> = ({ visible, schools, onClose, onDeleteSuccess }) => {
  const [password, setPassword] = useState('');
  const [verified, setVerified] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setPassword('');
      setVerified(false);
      setSelectedSchool(null);
      setConfirmText('');
      setDeleting(false);
    }
  }, [visible]);

  const handleVerify = () => {
    if (password === 'admin123' || password === 'superadmin') {
      setVerified(true);
    } else {
      Alert.alert('Access Denied', 'Incorrect Super Admin password');
    }
  };

  const handleDelete = async () => {
    if (!selectedSchool) {
      Alert.alert('Error', 'Please select a school to delete');
      return;
    }
    if (confirmText !== 'DELETE') {
      Alert.alert('Error', 'Please type DELETE to confirm');
      return;
    }

    setDeleting(true);
    try {
      await adminService.deleteSchool(selectedSchool.id);
      Alert.alert('Success', `School ${selectedSchool.name} has been deleted`);
      onDeleteSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete school');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <AppText style={[styles.modalTitle, { color: colors.error }]}>Secure Deletion</AppText>
              <AppText style={{ fontSize: 12, color: colors.textMuted }}>Danger Zone - Authorize school removal</AppText>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 24 }}>
            {!verified ? (
              <View style={{ gap: 16 }}>
                <View style={[styles.warningBanner, { backgroundColor: colors.errorSoft, borderColor: colors.errorSoft }]}>
                  <AlertTriangle size={18} color={colors.error} />
                  <AppText style={{ color: colors.error, fontSize: 12, fontWeight: '700', flex: 1 }}>
                    Security Authorization Required. Enter your super admin password to unlock these actions.
                  </AppText>
                </View>

                <View style={styles.formGroup}>
                  <AppText style={styles.formLabel}>Super Admin Password</AppText>
                  <TextInput
                    style={styles.formInput}
                    secureTextEntry
                    placeholder="Enter password..."
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                <AppButton title="Authorize Access" onPress={handleVerify} />
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                <View style={styles.formGroup}>
                  <AppText style={styles.formLabel}>Select School to Delete</AppText>
                  <TouchableOpacity
                    style={styles.formInput}
                    onPress={() => setShowPicker(true)}
                  >
                    <AppText style={{ color: selectedSchool ? colors.textPrimary : colors.textMuted }}>
                      {selectedSchool ? `${selectedSchool.school_id} - ${selectedSchool.name}` : 'Tap to select school...'}
                    </AppText>
                  </TouchableOpacity>
                </View>

                {selectedSchool && (
                  <>
                    <View style={[styles.warningBanner, { backgroundColor: colors.warningSoft }]}>
                      <AlertTriangle size={18} color={colors.warning} />
                      <AppText style={{ color: colors.warning, fontSize: 12, fontWeight: '700', flex: 1 }}>
                        CRITICAL: Deleting "{selectedSchool.name}" is permanent and will wipe all associated teachers, students, and attendance records.
                      </AppText>
                    </View>

                    <View style={styles.formGroup}>
                      <AppText style={styles.formLabel}>Type "DELETE" to confirm</AppText>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Type DELETE..."
                        placeholderTextColor={colors.textMuted}
                        value={confirmText}
                        onChangeText={setConfirmText}
                        autoCapitalize="characters"
                      />
                    </View>

                    <AppButton
                      title={deleting ? 'Deleting school...' : 'Delete School Permanently'}
                      onPress={handleDelete}
                      disabled={deleting || confirmText !== 'DELETE'}
                    />
                  </>
                )}
              </View>
            )}
          </ScrollView>

          <Modal visible={showPicker} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxHeight: '60%' }]}>
                <View style={styles.modalHeader}>
                  <AppText style={styles.modalTitle}>Choose School</AppText>
                  <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.modalClose}>
                    <X size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                  {schools.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                      onPress={() => {
                        setSelectedSchool(s);
                        setShowPicker(false);
                      }}
                    >
                      <AppText style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
                        {s.school_id} - {s.name}
                      </AppText>
                      <AppText style={{ fontSize: 12, color: colors.textMuted }}>{s.email}</AppText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

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

  useEffect(() => {
    loadSettingsData();
  }, []);

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
    if (key === 'enable_auto_pay') setEnableAutoPay(value);
    if (key === 'enable_promotion') setEnablePromotion(value);

    try {
      await API.post('/pricing/admin/settings', {
        [key]: value ? 'true' : 'false'
      });
    } catch (err) {
      console.error(`Failed to update ${key}`, err);
      Alert.alert('Error', 'Failed to update system setting. Reverting...');
      // Revert state
      if (key === 'enable_auto_pay') setEnableAutoPay(!value);
      if (key === 'enable_promotion') setEnablePromotion(!value);
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
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

      <View style={[styles.headerStandard, { paddingTop: insets.top + 20, paddingBottom: 30 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBackPress}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <AppText style={styles.headerTitle}>System Settings</AppText>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.contentContainer, { marginTop: -20 }]}
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
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={'#fff'}
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
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={'#fff'}
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
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={'#fff'}
            />
          </View>
        </View>

        {/* Danger Zone Section */}
        <AppCard style={styles.dangerZoneCard}>
          <AppText style={styles.dangerZoneTitle}>Danger Zone</AppText>
          <AppText style={styles.dangerZoneSub}>Actions here require super admin password verification and are permanent.</AppText>
          <TouchableOpacity
            style={styles.dangerZoneActionBtn}
            onPress={() => setSecureDeleteModalOpen(true)}
            activeOpacity={0.7}
          >
            <Trash2 size={18} color="#fff" />
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
  container: { flex: 1, backgroundColor: colors.bg },
  headerStandard: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
    color: '#fff',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
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
    paddingBottom: 16,
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
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  helperText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  dangerZoneCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderColor: '#fecaca',
    borderWidth: 1.5,
    padding: 16,
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
    marginBottom: 4,
  },
  dangerZoneSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 16,
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
    color: '#fff',
    fontSize: 14,
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
    backgroundColor: colors.bg,
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
});
"""

with open(settings_path, 'w') as f:
    f.write(settings_code)
