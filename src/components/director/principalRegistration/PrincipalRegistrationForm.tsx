import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import AppCard from '../../common/AppCard';
import AppButton from '../../common/AppButton';
import BranchStep from './BranchStep';
import PrincipalDetailsStep from './PrincipalDetailsStep';
import ClassesStep from './ClassesStep';
import { safeTrim } from './helpers';
import { REGISTRATION_STEPS } from './types';
import type { ClassSection, FormData } from './types';
import { principalRegistrationStyles as styles } from './principalRegistrationStyles';

interface PrincipalRegistrationFormProps {
  schoolCode: string;
  form: FormData;
  activeStep: number;
  inviteLink: string;
  showInviteLink: boolean;
  onCopyInviteLink: () => void;
  onChange: (field: keyof FormData, value: string) => void;
  fieldErrors: Record<string, string>;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  otp: string;
  setOtp: (value: string) => void;
  otpSent: boolean;
  emailVerified: boolean;
  otpSending: boolean;
  otpVerifying: boolean;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
  classes: ClassSection[];
  onUpdateClassName: (index: number, value: string) => void;
  onAddClass: () => void;
  onRemoveClass: (index: number) => void;
  onAddSection: (classIndex: number) => void;
  onRemoveSection: (classIndex: number, sectionIndex: number) => void;
  onUpdateSection: (classIndex: number, sectionIndex: number, value: string) => void;
  classSectionErrors: string[];
  focusedField: string | null;
  setFocusedField: (field: string | null) => void;
  loading: boolean;
  canSubmit: boolean;
  onCancel: () => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export default function PrincipalRegistrationForm({
  schoolCode,
  form,
  activeStep,
  inviteLink,
  showInviteLink,
  onCopyInviteLink,
  onChange,
  fieldErrors,
  confirmPassword,
  onConfirmPasswordChange,
  otp,
  setOtp,
  otpSent,
  emailVerified,
  otpSending,
  otpVerifying,
  onSendOtp,
  onVerifyOtp,
  classes,
  onUpdateClassName,
  onAddClass,
  onRemoveClass,
  onAddSection,
  onRemoveSection,
  onUpdateSection,
  classSectionErrors,
  focusedField,
  setFocusedField,
  loading,
  canSubmit,
  onCancel,
  onBack,
  onNext,
  onSubmit,
}: PrincipalRegistrationFormProps) {
  const totalSteps = REGISTRATION_STEPS.length;

  return (
    <AppCard style={styles.formCard} padded={false}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>Register Principal</Text>
          <View style={styles.cardBadges}>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>School: {schoolCode || '—'}</Text>
            </View>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>Branch: {safeTrim(form.branch_id) || '—'}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity accessibilityRole="button" style={styles.copyLinkBtn} onPress={onCopyInviteLink}>
          <Text style={styles.copyLinkBtnText}>🔗 Copy Invite Link</Text>
        </TouchableOpacity>
      </View>

      {showInviteLink && inviteLink && (
        <View style={styles.linkBanner}>
          <Text style={styles.linkBannerText}>
            <Text style={styles.linkBannerLabel}>Invite Link:</Text> {inviteLink}
          </Text>
        </View>
      )}

      <View style={styles.formBody}>
        {activeStep === 0 && (
          <BranchStep form={form} onChange={onChange} errors={fieldErrors} />
        )}
        {activeStep === 1 && (
          <PrincipalDetailsStep
            form={form}
            onChange={onChange}
            confirmPassword={confirmPassword}
            onConfirmPasswordChange={onConfirmPasswordChange}
            errors={fieldErrors}
            otp={otp}
            setOtp={setOtp}
            otpSent={otpSent}
            emailVerified={emailVerified}
            otpSending={otpSending}
            otpVerifying={otpVerifying}
            onSendOtp={onSendOtp}
            onVerifyOtp={onVerifyOtp}
          />
        )}
        {activeStep === 2 && (
          <ClassesStep
            classes={classes}
            onUpdateClassName={onUpdateClassName}
            onAddClass={onAddClass}
            onRemoveClass={onRemoveClass}
            onAddSection={onAddSection}
            onRemoveSection={onRemoveSection}
            onUpdateSection={onUpdateSection}
            errors={classSectionErrors}
            fieldErrors={fieldErrors}
            focusedField={focusedField}
            setFocusedField={setFocusedField}
          />
        )}

        <View style={styles.formFooter}>
          {activeStep === 0 ? (
            <AppButton title="Cancel" onPress={onCancel} type="secondary" />
          ) : (
            <AppButton title="← Back" onPress={onBack} type="secondary" />
          )}
          {activeStep < totalSteps - 1 ? (
            <AppButton title="Next →" onPress={onNext} />
          ) : (
            <AppButton
              title={loading ? 'Registering...' : '✓ Register Principal'}
              onPress={onSubmit}
              disabled={loading || !canSubmit}
            />
          )}
        </View>
      </View>

      <View style={styles.hintBox}>
        <Text style={styles.hintText}>
          ℹ️ Principal can login using: School Code + Employee ID or Email + Password
        </Text>
      </View>
    </AppCard>
  );
}
