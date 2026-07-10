import React from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Camera,
} from 'lucide-react-native';
import AppText from '../../common/AppText';
import AppCard from '../../common/AppCard';
import { C, Theme } from '../../../theme/tokens';
import EnrollmentStepper from './EnrollmentStepper';
import { calculateAge } from './helpers';
import { teacherManagementStyles as styles } from './styles';
import {
  STEPS,
  BLOOD_GROUPS,
  GENDER_OPTIONS,
  DESIGNATION_OPTIONS,
  QUALIFICATION_OPTIONS,
  EMPLOYMENT_TYPES,
  STATUS_OPTIONS,
  type TeacherFormData,
} from './types';

export interface TeacherEnrollmentFormProps {
  step: number;
  formData: TeacherFormData;
  fieldErrors: Record<string, string>;
  loading: boolean;
  serverError: string;
  serverSuccess: string;
  otp: string;
  otpSent: boolean;
  emailVerified: boolean;
  otpSending: boolean;
  otpVerifying: boolean;
  showDatePicker: boolean;
  datePickerField: 'date_of_birth' | 'date_of_joining';
  onFieldChange: (name: string, value: string) => void;
  onOtpChange: (value: string) => void;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
  onShowDatePickerChange: (show: boolean) => void;
  onDatePickerFieldChange: (field: 'date_of_birth' | 'date_of_joining') => void;
  onFormDataChange: (updater: (prev: TeacherFormData) => TeacherFormData) => void;
  onImagePick: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function TeacherEnrollmentForm({
  step,
  formData,
  fieldErrors,
  loading,
  serverError,
  serverSuccess,
  otp,
  otpSent,
  emailVerified,
  otpSending,
  otpVerifying,
  showDatePicker,
  datePickerField,
  onFieldChange,
  onOtpChange,
  onSendOtp,
  onVerifyOtp,
  onShowDatePickerChange,
  onDatePickerFieldChange,
  onFormDataChange,
  onImagePick,
  onPrevStep,
  onNextStep,
  onSubmit,
  onCancel,
}: TeacherEnrollmentFormProps) {
  const renderFormField = (
    name: string,
    label: string,
    placeholder: string,
    type: 'text' | 'number' | 'date' | 'select' = 'text',
    options?: string[],
  ) => {
    const value = formData[name as keyof TeacherFormData] as string;
    const error = fieldErrors[name];

    if (type === 'select' && options) {
      return (
        <View key={name} style={styles.formGroup}>
          <AppText style={styles.label} weight="semibold">{label}</AppText>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={value}
              onValueChange={(val) => onFieldChange(name, val)}
              style={styles.picker}
              dropdownIconColor={C.muted}
            >
              <Picker.Item label={`Select ${label}`} value="" color={C.muted} />
              {options.map((opt) => (
                <Picker.Item key={opt} label={opt} value={opt} color={C.text} />
              ))}
            </Picker>
          </View>
          {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
        </View>
      );
    }

    if (type === 'date') {
      return (
        <View key={name} style={styles.formGroup}>
          <AppText style={styles.label} weight="semibold">{label}</AppText>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.input, error && styles.inputError]}
            onPress={() => {
              onDatePickerFieldChange(name as 'date_of_birth' | 'date_of_joining');
              onShowDatePickerChange(true);
            }}
          >
            <AppText style={value ? styles.dateText : styles.placeholderText}>
              {value || `Select ${label}`}
            </AppText>
          </TouchableOpacity>
          {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
        </View>
      );
    }

    return (
      <View key={name} style={styles.formGroup}>
        <AppText style={styles.label} weight="semibold">{label}</AppText>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          value={value}
          onChangeText={(text) => onFieldChange(name, text)}
          keyboardType={type === 'number' ? 'numeric' : 'default'}
          secureTextEntry={name === 'password'}
          maxLength={
            ['mobile_number', 'alternate_mobile_number', 'emergency_contact_number'].includes(name)
              ? 10
              : name === 'aadhaar_number'
                ? 12
                : name === 'pin_code'
                  ? 6
                  : undefined
          }
        />
        {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
      </View>
    );
  };

  return (
    <>
      {serverError ? (
        <View style={styles.errorBox}>
          <AppText style={styles.errorBoxText}>{serverError}</AppText>
        </View>
      ) : null}
      {serverSuccess ? (
        <View style={styles.successBox}>
          <AppText style={styles.successBoxText}>{serverSuccess}</AppText>
        </View>
      ) : null}

      <AppCard style={styles.formCard} padded={false} variant="bordered">
        <View style={styles.formCardHeader}>
          <EnrollmentStepper currentStep={step} />
        </View>

        <View style={styles.formBody}>
          {step === 0 && (
            <>
              <AppText style={styles.sectionTitle} weight="bold">Personal Details</AppText>
              <View style={styles.formGrid}>
                {renderFormField('teacher_full_name', 'Full Name *', 'e.g. Ramesh Kumar', 'text')}
                {renderFormField('gender', 'Gender *', 'Select Gender', 'select', GENDER_OPTIONS)}
                {renderFormField('date_of_birth', 'Date of Birth *', '', 'date')}
                <View style={styles.formGroup}>
                  <AppText style={styles.label} weight="semibold">Age (auto-calculated)</AppText>
                  <TextInput style={[styles.input, styles.readOnlyInput]} value={formData.age ? `${formData.age} years` : ''} editable={false} />
                </View>
                {renderFormField('blood_group', 'Blood Group', 'Select', 'select', BLOOD_GROUPS)}
                {renderFormField('nationality', 'Nationality *', 'Indian', 'text')}
                {renderFormField('mother_tongue', 'Mother Tongue *', '', 'text')}
                <View style={styles.formGroupFull}>
                  <AppText style={styles.label} weight="semibold">Email ID *</AppText>
                  <View style={styles.emailRow}>
                    <TextInput
                      style={[styles.input, styles.emailInput, fieldErrors.email_id && styles.inputError]}
                      placeholder="teacher@email.com"
                      placeholderTextColor={C.muted}
                      value={formData.email_id}
                      onChangeText={(text) => onFieldChange('email_id', text)}
                      editable={!emailVerified}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={[styles.verifyBtn, emailVerified && styles.verifyBtnSuccess]}
                      onPress={onSendOtp}
                      disabled={otpSending || emailVerified}
                    >
                      <AppText style={styles.verifyBtnText} weight="bold">
                        {emailVerified ? 'Verified' : otpSending ? 'Sending...' : 'Verify'}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                  {fieldErrors.email_id ? <AppText style={styles.errorText}>{fieldErrors.email_id}</AppText> : null}
                  {otpSent && !emailVerified ? (
                    <View style={styles.otpRow}>
                      <TextInput
                        style={[styles.input, styles.otpInput]}
                        placeholder="Enter OTP"
                        placeholderTextColor={C.muted}
                        value={otp}
                        onChangeText={onOtpChange}
                        keyboardType="numeric"
                      />
                      <TouchableOpacity accessibilityRole="button" style={styles.verifyBtn} onPress={onVerifyOtp} disabled={otpVerifying}>
                        <AppText style={styles.verifyBtnText} weight="bold">{otpVerifying ? 'Verifying...' : 'Verify OTP'}</AppText>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
                {renderFormField('religion', 'Religion', '', 'text')}
                {renderFormField('marital_status', 'Marital Status', '', 'text')}
                {renderFormField('aadhaar_number', 'Aadhaar Number *', '12-digit Aadhaar', 'number')}
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <AppText style={styles.sectionTitle} weight="bold">Contact & Address</AppText>
              <View style={styles.formGrid}>
                {renderFormField('mobile_number', 'Mobile Number *', '10-digit mobile', 'number')}
                {renderFormField('alternate_mobile_number', 'Alternate Mobile', '10-digit mobile', 'number')}
                {renderFormField('house_no', 'House No *', '', 'text')}
                {renderFormField('street_locality', 'Street / Locality *', '', 'text')}
                {renderFormField('village_town_city', 'City / Town *', '', 'text')}
                {renderFormField('mandal_taluk', 'Mandal / Taluk *', '', 'text')}
                {renderFormField('district', 'District *', '', 'text')}
                {renderFormField('state', 'State *', '', 'text')}
                {renderFormField('pin_code', 'Pin Code *', '6-digit pin code', 'number')}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <AppText style={styles.sectionTitle} weight="bold">Emergency Contact</AppText>
              <View style={styles.formGrid}>
                {renderFormField('emergency_contact_name', 'Contact Name *', '', 'text')}
                {renderFormField('emergency_contact_number', 'Contact Number *', '10-digit mobile', 'number')}
                {renderFormField('emergency_contact_relationship', 'Relationship *', '', 'text')}
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <AppText style={styles.sectionTitle} weight="bold">Employment Details</AppText>
              <View style={styles.formGrid}>
                <View style={styles.formGroup}>
                  <AppText style={styles.label} weight="semibold">Employee ID</AppText>
                  <TextInput style={[styles.input, styles.readOnlyInput]} value={formData.employee_id} editable={false} />
                  <AppText style={styles.hintText}>Employee ID will be assigned after save.</AppText>
                </View>
                {renderFormField('designation', 'Designation *', '', 'select', DESIGNATION_OPTIONS)}
                {renderFormField('department_subject', 'Department / Subject *', '', 'text')}
                {renderFormField('qualification', 'Qualification', '', 'select', QUALIFICATION_OPTIONS)}
                {renderFormField('experience_years', 'Experience (Years)', '0-50', 'number')}
                {renderFormField('date_of_joining', 'Date of Joining *', '', 'date')}
                {renderFormField('employment_type', 'Employment Type', '', 'select', EMPLOYMENT_TYPES)}
                {renderFormField('teacher_status', 'Teacher Status', '', 'select', STATUS_OPTIONS)}
                <View style={styles.formGroupFull}>
                  <AppText style={styles.label} weight="semibold">Email *</AppText>
                  <TextInput style={[styles.input, styles.readOnlyInput]} value={formData.email_id} editable={false} />
                </View>
                {renderFormField('password', 'Password *', 'Min. 6 characters', 'text')}
                {renderFormField('salary_amount', 'Salary Amount', 'Optional', 'number')}
                <View style={styles.formGroupFull}>
                  <AppText style={styles.label} weight="semibold">Teacher Photo *</AppText>
                  <TouchableOpacity accessibilityRole="button" style={styles.photoZone} onPress={onImagePick}>
                    {formData.teacher_photograph ? (
                      <Image source={{ uri: formData.teacher_photograph.uri }} style={styles.photoPreview} />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Camera size={32} color={C.muted} />
                        <AppText style={styles.photoText}>Tap to add photo</AppText>
                        <AppText style={styles.photoSubtext}>Camera or Gallery</AppText>
                      </View>
                    )}
                  </TouchableOpacity>
                  {fieldErrors.teacher_photograph ? <AppText style={styles.errorText}>{fieldErrors.teacher_photograph}</AppText> : null}
                </View>
              </View>
            </>
          )}

          {step === 4 && (
            <>
              <AppText style={styles.sectionTitle} weight="bold">Registration Preview</AppText>
              <AppText style={styles.previewHint}>Review all details before submitting.</AppText>
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <View style={styles.previewPhoto}>
                    {formData.teacher_photograph ? (
                      <Image source={{ uri: formData.teacher_photograph.uri }} style={styles.previewPhotoImage} />
                    ) : (
                      <AppText style={styles.previewInitial} weight="bold">
                        {formData.teacher_full_name ? formData.teacher_full_name.charAt(0).toUpperCase() : 'T'}
                      </AppText>
                    )}
                  </View>
                  <View style={styles.previewInfo}>
                    <AppText style={styles.previewName} weight="bold">{formData.teacher_full_name || '—'}</AppText>
                    <AppText style={styles.previewDesignation}>
                      {formData.designation || '—'} · {formData.department_subject || '—'}
                    </AppText>
                    <AppText style={styles.previewEmail}>{formData.email_id || '—'}</AppText>
                    <View style={[styles.previewStatus, formData.teacher_status === 'ACTIVE' ? styles.previewStatusActive : styles.previewStatusInactive]}>
                      {formData.teacher_status === 'ACTIVE' ? (
                        <CheckCircle2 size={10} color={Theme.colors.card} />
                      ) : (
                        <XCircle size={10} color={Theme.colors.card} />
                      )}
                      <AppText style={styles.previewStatusText} weight="bold">{formData.teacher_status}</AppText>
                    </View>
                  </View>
                </View>

                {([
                  ['Personal Information', [
                    ['Gender', formData.gender], ['Date of Birth', formData.date_of_birth],
                    ['Age', formData.age], ['Blood Group', formData.blood_group || '—'],
                    ['Nationality', formData.nationality], ['Mother Tongue', formData.mother_tongue],
                    ['Religion', formData.religion || '—'], ['Marital Status', formData.marital_status || '—'],
                    ['Aadhaar', formData.aadhaar_number || '—'],
                  ]],
                  ['Contact & Address', [
                    ['Mobile', formData.mobile_number], ['Alt Mobile', formData.alternate_mobile_number || '—'],
                    ['House No', formData.house_no], ['Street', formData.street_locality],
                    ['City', formData.village_town_city], ['Mandal', formData.mandal_taluk],
                    ['District', formData.district], ['State', formData.state],
                    ['Pin Code', formData.pin_code],
                  ]],
                  ['Emergency Contact', [
                    ['Contact Name', formData.emergency_contact_name],
                    ['Contact Number', formData.emergency_contact_number],
                    ['Relationship', formData.emergency_contact_relationship],
                  ]],
                  ['Employment Details', [
                    ['Employee ID', formData.employee_id], ['Designation', formData.designation],
                    ['Department', formData.department_subject], ['Qualification', formData.qualification || '—'],
                    ['Experience', formData.experience_years ? `${formData.experience_years} yrs` : '—'],
                    ['Joining Date', formData.date_of_joining], ['Employment Type', formData.employment_type],
                    ['Salary', formData.salary_amount || '—'],
                  ]],
                ] as const).map(([title, fields]) => (
                  <React.Fragment key={title}>
                    <AppText style={styles.previewSectionTitle} weight="bold">{title}</AppText>
                    <View style={styles.previewGrid}>
                      {fields.map(([label, value]) => (
                        <View key={label} style={styles.previewItem}>
                          <AppText style={styles.previewLabel} weight="bold">{label}</AppText>
                          <AppText style={styles.previewValue} weight="semibold">{value || '—'}</AppText>
                        </View>
                      ))}
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.formFooter}>
          <TouchableOpacity accessibilityRole="button" style={styles.cancelBtn} onPress={step === 0 ? onCancel : onPrevStep} disabled={loading}>
            <ChevronLeft size={16} color={C.text} />
            <AppText style={styles.cancelBtnText} weight="semibold">{step === 0 ? 'Cancel' : 'Back'}</AppText>
          </TouchableOpacity>
          <View style={styles.footerRight}>
            <AppText style={styles.stepIndicator}>{step + 1}/{STEPS.length}</AppText>
            {step < STEPS.length - 1 ? (
              <TouchableOpacity accessibilityRole="button" style={styles.nextBtn} onPress={onNextStep} disabled={loading}>
                <AppText style={styles.nextBtnText} weight="semibold">Next</AppText>
                <ChevronRight size={16} color={Theme.colors.card} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity accessibilityRole="button" style={styles.submitBtn} onPress={onSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color={Theme.colors.card} />
                ) : (
                  <>
                    <CheckCircle2 size={16} color={Theme.colors.card} />
                    <AppText style={styles.submitBtnText} weight="semibold">Register</AppText>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </AppCard>

      {showDatePicker ? (
        <DateTimePicker
          value={datePickerField === 'date_of_birth' && formData.date_of_birth ? new Date(formData.date_of_birth) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(_event, selectedDate) => {
            onShowDatePickerChange(false);
            if (selectedDate) {
              const dateStr = selectedDate.toISOString().split('T')[0];
              if (datePickerField === 'date_of_birth') {
                onFormDataChange((prev) => ({ ...prev, date_of_birth: dateStr, age: calculateAge(dateStr) }));
              } else {
                onFormDataChange((prev) => ({ ...prev, date_of_joining: dateStr }));
              }
            }
          }}
        />
      ) : null}
    </>
  );
}
