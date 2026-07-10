import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AlertTriangle, Trash2, Lock, CheckCircle2 } from 'lucide-react-native';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import { Theme } from '../../theme/tokens';
import * as adminService from '../../services/adminService';

export default function DeleteSchoolScreen() {
  const navigation = useNavigation();
  const [schoolId, setSchoolId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [deletedInfo, setDeletedInfo] = useState<any>(null);

  const expected = `DELETE_${schoolId.trim().toUpperCase()}`;

  const verifyPassword = async () => {
    if (!schoolId.trim() || !password) {
      Alert.alert('Error', 'Enter school ID and super admin password');
      return;
    }
    setLoading(true);
    try {
      await adminService.verifySuperAdminPassword(schoolId.trim(), password);
      setStep(2);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const deleteSchool = async () => {
    if (confirmationText !== expected) {
      Alert.alert('Error', `Type exactly: ${expected}`);
      return;
    }
    setLoading(true);
    try {
      const result = await adminService.deleteSchoolComplete(
        schoolId.trim(),
        password,
        confirmationText,
      );
      setDeletedInfo(result);
      setStep(3);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        keyboardShouldPersistTaps="handled"
      >
        <StandardPageHeader
          scrollWithContent
          title="Delete School"
          onBackPress={() => navigation.goBack()}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />

        <View style={[innerPageLayoutStyles.scrollBody, styles.content]}>
        <AppCard style={styles.warningCard}>
          <AlertTriangle size={24} color={Theme.colors.error} />
          <AppText weight="bold" style={styles.warningTitle}>Danger Zone</AppText>
          <AppText style={styles.warningText}>
            Permanently deletes a school, all branches, users, and database schema. This cannot be undone.
          </AppText>
        </AppCard>

        {step === 3 ? (
          <AppCard style={styles.successCard}>
            <CheckCircle2 size={32} color={Theme.colors.success} />
            <AppText weight="bold" style={styles.successTitle}>School Deleted</AppText>
            <AppText style={styles.successText}>
              {deletedInfo?.school_name || schoolId} has been permanently removed.
            </AppText>
            <AppButton title="Done" onPress={() => navigation.goBack()} />
          </AppCard>
        ) : (
          <>
            <AppText style={styles.label}>School ID</AppText>
            <TextInput
              style={styles.input}
              value={schoolId}
              onChangeText={setSchoolId}
              placeholder="e.g. SUNRISE001"
              placeholderTextColor={Theme.colors.textMuted}
              autoCapitalize="characters"
              editable={step === 1}
            />

            <AppText style={styles.label}>Super Admin Password</AppText>
            <View style={styles.passwordRow}>
              <Lock size={18} color={Theme.colors.textMuted} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="Super admin password"
                placeholderTextColor={Theme.colors.textMuted}
                secureTextEntry
              />
            </View>

            {step === 2 && (
              <>
                <AppText style={styles.label}>Confirmation</AppText>
                <AppText style={styles.confirmHint}>Type: {expected}</AppText>
                <TextInput
                  style={styles.input}
                  value={confirmationText}
                  onChangeText={setConfirmationText}
                  placeholder={expected}
                  placeholderTextColor={Theme.colors.textMuted}
                  autoCapitalize="characters"
                />
              </>
            )}

            {step === 1 ? (
              <AppButton title={loading ? 'Verifying...' : 'Verify & Continue'} onPress={verifyPassword} disabled={loading} />
            ) : (
              <TouchableOpacity
                style={[styles.deleteBtn, loading && { opacity: 0.6 }]}
                onPress={deleteSchool}
                disabled={loading || confirmationText !== expected}
              >
                {loading ? (
                  <ActivityIndicator color={Theme.colors.card} />
                ) : (
                  <>
                    <Trash2 size={18} color={Theme.colors.card} />
                    <AppText style={styles.deleteBtnText} weight="bold">Delete Permanently</AppText>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { padding: Theme.spacing.md, paddingBottom: 100 },
  warningCard: { padding: Theme.spacing.md, alignItems: 'center', marginBottom: Theme.spacing.xl, borderColor: Theme.colors.error, borderWidth: 1 },
  warningTitle: { fontSize: Theme.typography.h3.fontSize, color: Theme.colors.error, marginTop: Theme.spacing.sm },
  warningText: { textAlign: 'center', color: Theme.colors.textSec, marginTop: Theme.spacing.sm, lineHeight: 20 },
  label: { fontSize: Theme.typography.caption.fontSize, fontWeight: '600', color: Theme.colors.textSec, marginBottom: 6, marginTop: Theme.spacing.md },
  input: {
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: Theme.spacing.md,
    color: Theme.colors.text,
    fontSize: Theme.typography.bodyMd.fontSize,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm },
  passwordInput: { flex: 1 },
  confirmHint: { fontSize: Theme.typography.caption.fontSize, color: Theme.colors.error, marginBottom: Theme.spacing.sm, fontWeight: '600' },
  deleteBtn: {
    marginTop: Theme.spacing.lg,
    backgroundColor: Theme.colors.error,
    borderRadius: Theme.radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
  },
  deleteBtnText: { color: Theme.colors.card, fontSize: Theme.typography.h4.fontSize },
  successCard: { padding: Theme.spacing.lg, alignItems: 'center', gap: Theme.spacing.md },
  successTitle: { fontSize: Theme.typography.h3.fontSize, color: Theme.colors.success },
  successText: { textAlign: 'center', color: Theme.colors.textSec },
});
