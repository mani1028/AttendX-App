import React, { useState } from 'react';
import { View, Text } from 'react-native';
import AppCard from '../../common/AppCard';
import AppButton from '../../common/AppButton';
import {
  BranchStep,
  PrincipalDetailsStep,
  ClassesStep,
  safeTrim,
  REGISTRATION_STEPS,
  type FormData,
  type ClassSection,
} from '../../director/principalRegistration';
import { publicPrincipalRegistrationStyles as styles } from './publicPrincipalRegistrationStyles';

interface PublicPrincipalRegistrationFormProps {
  schoolCode: string;
  form: FormData;
  activeStep: number;
  classes: ClassSection[];
  confirmPassword: string;
  fieldErrors: Record<string, string>;
  classSectionErrors: string[];
  otp: string;
  otpSent: boolean;
  emailVerified: boolean;
  otpSending: boolean;
  otpVerifying: boolean;
  loading: boolean;
  canSubmit: boolean;
  onChange: (field: keyof FormData, value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  setOtp: (value: string) => void;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
  onUpdateClassName: (index: number, value: string) => void;
  onAddClass: () => void;
  onRemoveClass: (index: number) => void;
  onAddSection: (classIndex: number) => void;
  onUpdateSection: (classIndex: number, sectionIndex: number, value: string) => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export default function PublicPrincipalRegistrationForm({
  schoolCode,
  form,
  activeStep,
  classes,
  confirmPassword,
  fieldErrors,
  classSectionErrors,
  otp,
  otpSent,
  emailVerified,
  otpSending,
  otpVerifying,
  loading,
  canSubmit,
  onChange,
  onConfirmPasswordChange,
  setOtp,
  onSendOtp,
  onVerifyOtp,
  onUpdateClassName,
  onAddClass,
  onRemoveClass,
  onAddSection,
  onUpdateSection,
  onBack,
  onNext,
  onSubmit,
}: PublicPrincipalRegistrationFormProps) {
  const totalSteps = REGISTRATION_STEPS.length;
  const [focusedField, setFocusedField] = useState<string | null>(null);

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>📋 Principal Registration</Text>
        <Text style={styles.subtitle}>
          Public invite — Step {activeStep + 1} of {totalSteps}
        </Text>
      </View>

      <View style={styles.stepper}>
        {REGISTRATION_STEPS.map((step, i) => (
          <View key={step.label} style={styles.stepItem}>
            <View style={[styles.stepCircle, activeStep > i && styles.stepCompleted, activeStep === i && styles.stepActive]}>
              {activeStep > i ? (
                <Text style={styles.stepIcon}>✓</Text>
              ) : (
                <Text style={styles.stepNumber}>{step.icon}</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, activeStep === i && styles.stepLabelActive, activeStep > i && styles.stepLabelCompleted]}>
              {step.label}
            </Text>
          </View>
        ))}
      </View>

      <AppCard style={styles.formCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>🔗 Public Principal Registration</Text>
            <View style={styles.cardBadges}>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>School: {schoolCode || '—'}</Text>
              </View>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>Branch: {safeTrim(form.branch_id) || '—'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.publicBanner}>
          <Text style={styles.publicBannerText}>
            ✅ Public registration — School & Branch are locked by invite URL.
          </Text>
        </View>

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
              onRemoveSection={() => {}}
              onUpdateSection={onUpdateSection}
              errors={classSectionErrors}
              fieldErrors={fieldErrors}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
            />
          )}

          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              ℹ️ Principal can login using: School Code + (Email or Employee ID) + Password
            </Text>
          </View>

          <View style={styles.formFooter}>
            {activeStep === 0 ? <View /> : <AppButton title="← Back" onPress={onBack} type="secondary" />}
            {activeStep < totalSteps - 1 ? (
              <AppButton title="Next →" onPress={onNext} />
            ) : (
              <AppButton
                title={loading ? 'Registering...' : '✓ Register Headmaster'}
                onPress={onSubmit}
                disabled={loading || !canSubmit}
              />
            )}
          </View>
        </View>
      </AppCard>

      <View style={styles.footer}>
        <Text style={styles.footerText}>🏫 School: {schoolCode || '—'}</Text>
        <Text style={styles.footerText}>🏢 Branch: {safeTrim(form.branch_id) || '—'}</Text>
        <Text style={styles.footerText}>🌐 Mode: Public Invite</Text>
      </View>
    </>
  );
}
