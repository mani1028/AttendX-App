import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Eye, EyeOff } from 'lucide-react-native';
import AppButton from '../common/AppButton';
import AppText from '../common/AppText';
import { Theme } from '../../theme/tokens';
import type { PasswordChangeStep } from './types';
import { getPasswordStrength, isStrongPassword } from './helpers';
import ProfilePasswordRequirement from './ProfilePasswordRequirement';
import { profileStyles as styles } from './profileStyles';

interface ProfilePasswordChangeModalProps {
  visible: boolean;
  step: PasswordChangeStep;
  loading: boolean;
  otp: string;
  error: string;
  success: string;
  newPassword: string;
  confirmPassword: string;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
  targetEmail: string;
  onClose: () => void;
  onRequestOtp: () => void;
  onVerifyOtp: () => void;
  onChangePassword: () => void;
  onOtpChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onToggleNewPassword: () => void;
  onToggleConfirmPassword: () => void;
}

export default function ProfilePasswordChangeModal({
  visible,
  step,
  loading,
  otp,
  error,
  success,
  newPassword,
  confirmPassword,
  showNewPassword,
  showConfirmPassword,
  targetEmail,
  onClose,
  onRequestOtp,
  onVerifyOtp,
  onChangePassword,
  onOtpChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onToggleNewPassword,
  onToggleConfirmPassword,
}: ProfilePasswordChangeModalProps) {
  const strength = getPasswordStrength(newPassword);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle}>Change Password</AppText>
            <TouchableOpacity accessibilityRole="button" onPress={onClose}>
              <X size={24} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {error ? (
              <View style={styles.errorAlert}>
                <AppText style={styles.errorAlertText}>{error}</AppText>
              </View>
            ) : null}
            {success ? (
              <View style={styles.successAlert}>
                <AppText style={styles.successAlertText}>{success}</AppText>
              </View>
            ) : null}

            {step === 'otp-request' && (
              <View>
                <AppText style={styles.passwordStepLabel}>Step 1: Request OTP</AppText>
                <AppText style={styles.passwordStepDesc}>
                  We'll send an OTP to: {targetEmail}
                </AppText>
                <AppButton
                  title={loading ? 'Sending...' : 'Send OTP'}
                  onPress={onRequestOtp}
                  disabled={loading}
                  style={styles.passwordModalButton}
                />
              </View>
            )}

            {step === 'otp-verify' && (
              <View>
                <AppText style={styles.passwordStepLabel}>Step 2: Verify OTP</AppText>
                <AppText style={styles.passwordStepDesc}>
                  Enter the OTP sent to your email
                </AppText>
                <View style={styles.passwordInputGroup}>
                  <AppText style={styles.passwordInputLabel}>OTP Code</AppText>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter 4-6 digit OTP"
                    placeholderTextColor={Theme.colors.textSec}
                    value={otp}
                    onChangeText={onOtpChange}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!loading}
                  />
                </View>
                <AppButton
                  title={loading ? 'Verifying...' : 'Verify OTP'}
                  onPress={onVerifyOtp}
                  disabled={loading || !otp}
                  style={styles.passwordModalButton}
                />
              </View>
            )}

            {step === 'new-password' && (
              <View>
                <AppText style={styles.passwordStepLabel}>Step 3: Set New Password</AppText>

                <View style={styles.passwordInputGroup}>
                  <AppText style={styles.passwordInputLabel}>New Password</AppText>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordInputField}
                      placeholder="Enter new password"
                      placeholderTextColor={Theme.colors.textSec}
                      value={newPassword}
                      onChangeText={onNewPasswordChange}
                      secureTextEntry={!showNewPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.passwordToggleIcon}
                      onPress={onToggleNewPassword}
                    >
                      {showNewPassword ? (
                        <Eye size={18} color={Theme.colors.textSec} />
                      ) : (
                        <EyeOff size={18} color={Theme.colors.textSec} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.passwordInputGroup}>
                  <AppText style={styles.passwordInputLabel}>Confirm Password</AppText>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordInputField}
                      placeholder="Re-enter password"
                      placeholderTextColor={Theme.colors.textSec}
                      value={confirmPassword}
                      onChangeText={onConfirmPasswordChange}
                      secureTextEntry={!showConfirmPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.passwordToggleIcon}
                      onPress={onToggleConfirmPassword}
                    >
                      {showConfirmPassword ? (
                        <Eye size={18} color={Theme.colors.textSec} />
                      ) : (
                        <EyeOff size={18} color={Theme.colors.textSec} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {newPassword ? (
                  <View style={styles.passwordRequirements}>
                    <AppText style={styles.passwordReqTitle}>Password must have:</AppText>
                    <ProfilePasswordRequirement met={strength.minLength} text="At least 8 characters" />
                    <ProfilePasswordRequirement met={strength.hasUpper} text="At least 1 uppercase (A-Z)" />
                    <ProfilePasswordRequirement met={strength.hasLower} text="At least 1 lowercase (a-z)" />
                    <ProfilePasswordRequirement met={strength.hasNumber} text="At least 1 number (0-9)" />
                    <ProfilePasswordRequirement met={strength.hasSpecial} text="At least 1 special character" />
                  </View>
                ) : null}

                <AppButton
                  title={loading ? 'Changing Password...' : 'Change Password'}
                  onPress={onChangePassword}
                  disabled={loading || !newPassword || !confirmPassword || !isStrongPassword(newPassword)}
                  style={styles.passwordModalButton}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
