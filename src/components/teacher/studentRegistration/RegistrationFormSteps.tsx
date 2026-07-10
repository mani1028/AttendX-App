import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  User,
  BookOpen,
  Users,
  Heart,
  Camera,
  Eye,
  EyeOff,
  Check,
  Calendar,
} from 'lucide-react-native';
import AppText from '../../common/AppText';
import BloodGroupPicker from '../../common/BloodGroupPicker';
import FormSelectPicker from '../../common/FormSelectPicker';
import RegistrationFormField, { RequiredSectionTitle, StepRequiredLegend } from '../../common/RegistrationFormField';
import { Theme } from '../../../theme/tokens';
import {
  GENDER_OPTIONS,
  MEDIUM_OF_INSTRUCTION_OPTIONS,
  MODE_OF_TRANSPORT_OPTIONS,
  HOSTEL_DAY_SCHOLAR_OPTIONS,
  formatGenderLabel,
  formatOptionLabel,
} from '../../../utils/studentRegistrationValidation';
import PasswordStrength from './PasswordStrength';
import PreviewField from './PreviewField';
import type { FormData } from './types';

// ponytail: loose style map so teacher/public StyleSheets both plug in
export type RegistrationStyles = Record<string, object>;

export interface RegistrationFormStepsProps {
  step: number;
  form: FormData;
  fieldErrors: Record<string, string>;
  styles: RegistrationStyles;
  iconColor?: string;
  photoPreview: string | null;
  photoFile: unknown;
  showPassword: boolean;
  showConfirmPassword: boolean;
  showDOBPicker: boolean;
  showAdmissionDatePicker: boolean;
  classPickerOptions: { label: string; value: string }[];
  sectionPickerOptions: { label: string; value: string }[];
  academicYearOptions: { label: string; value: string }[];
  onChange: (name: keyof FormData, value: string) => void;
  onSectionChange: (text: string) => void;
  onClassChange: (className: string) => void;
  onDOBChange: (date: Date) => void;
  onImagePick: () => void;
  onTogglePassword: () => void;
  onToggleConfirmPassword: () => void;
  onShowDOBPicker: (show: boolean) => void;
  onShowAdmissionDatePicker: (show: boolean) => void;
}

export default function RegistrationFormSteps({
  step,
  form,
  fieldErrors,
  styles,
  iconColor = Theme.colors.primary,
  photoPreview,
  showPassword,
  showConfirmPassword,
  showDOBPicker,
  showAdmissionDatePicker,
  classPickerOptions,
  sectionPickerOptions,
  academicYearOptions,
  onChange,
  onSectionChange,
  onClassChange,
  onDOBChange,
  onImagePick,
  onTogglePassword,
  onToggleConfirmPassword,
  onShowDOBPicker,
  onShowAdmissionDatePicker,
}: RegistrationFormStepsProps) {
  return (
    <>
{/* Step 0: Basic Info */}
          {step === 0 && (
            <View>
              <StepRequiredLegend />
              <View style={styles.sectionHeader}>
                <User size={18} color={iconColor} />
                <AppText weight="bold" style={styles.sectionTitle}>Personal Details</AppText>
              </View>

              <RegistrationFormField label="First Name" step={step} fieldKey="first_name" error={fieldErrors.first_name}>
                <TextInput
                  style={[styles.input, fieldErrors.first_name && styles.inputError]}
                  placeholder="Enter first name"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.first_name}
                  onChangeText={(text) => onChange('first_name', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Last Name" step={step} fieldKey="last_name" error={fieldErrors.last_name}>
                <TextInput
                  style={[styles.input, fieldErrors.last_name && styles.inputError]}
                  placeholder="Enter last name"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.last_name}
                  onChangeText={(text) => onChange('last_name', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Gender" step={step} fieldKey="gender" error={fieldErrors.gender}>
                <View style={styles.genderContainer}>
                  {GENDER_OPTIONS.map((option) => (
                    <TouchableOpacity accessibilityRole="button"
                      key={option.value}
                      style={[styles.genderBtn, form.gender === option.value && styles.genderBtnActive]}
                      onPress={() => onChange('gender', option.value)}
                    >
                      <AppText weight="semibold" style={[styles.genderText, form.gender === option.value && styles.genderTextActive]}>
                        {option.label}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </RegistrationFormField>

              <RegistrationFormField label="Blood Group" step={step} required={false} error={fieldErrors.blood_group}>
                <BloodGroupPicker
                  value={form.blood_group}
                  onChange={(value) => onChange('blood_group', value)}
                  error={Boolean(fieldErrors.blood_group)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Date of Birth" step={step} fieldKey="date_of_birth" error={fieldErrors.date_of_birth}>
                <TouchableOpacity accessibilityRole="button" style={styles.dateBtn} onPress={() => onShowDOBPicker(true)}>
                  <Calendar size={18} color={Theme.colors.textSec} />
                  <AppText style={styles.dateText}>{form.date_of_birth || 'Select date'}</AppText>
                </TouchableOpacity>
                {showDOBPicker && (
                  <DateTimePicker
                    value={form.date_of_birth ? new Date(form.date_of_birth) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    onChange={(event, date) => {
                      if (date) {onDOBChange(date);}
                      onShowDOBPicker(false);
                    }}
                  />
                )}
              </RegistrationFormField>

              <RegistrationFormField label="Age (Auto-calculated)" step={step} required={false}>
                <TextInput style={[styles.input, styles.disabledInput]} value={form.age} editable={false} />
              </RegistrationFormField>

              <RegistrationFormField label="Nationality" step={step} fieldKey="nationality" error={fieldErrors.nationality}>
                <TextInput
                  style={[styles.input, fieldErrors.nationality && styles.inputError]}
                  placeholder="Nationality"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.nationality}
                  onChangeText={(text) => onChange('nationality', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Mother Tongue" step={step} required={false} error={fieldErrors.mother_tongue}>
                <TextInput
                  style={[styles.input, fieldErrors.mother_tongue && styles.inputError]}
                  placeholder="e.g. Telugu"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.mother_tongue}
                  onChangeText={(text) => onChange('mother_tongue', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Religion" step={step} required={false} error={fieldErrors.religion}>
                <TextInput
                  style={[styles.input, fieldErrors.religion && styles.inputError]}
                  placeholder="e.g. Hindu"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.religion}
                  onChangeText={(text) => onChange('religion', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Caste Category" step={step} required={false}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. OBC"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.caste_category}
                  onChangeText={(text) => onChange('caste_category', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Aadhaar Number" step={step} required={false} error={fieldErrors.aadhaar_number}>
                <TextInput
                  style={[styles.input, fieldErrors.aadhaar_number && styles.inputError]}
                  placeholder="12-digit Aadhaar"
                  placeholderTextColor={Theme.colors.textMuted}
                  keyboardType="numeric"
                  maxLength={12}
                  value={form.aadhaar_number}
                  onChangeText={(text) => onChange('aadhaar_number', text)}
                />
              </RegistrationFormField>
            </View>
          )}

          {/* Step 1: Academics */}
          {step === 1 && (
            <View>
              <StepRequiredLegend />
              <View style={styles.sectionHeader}>
                <BookOpen size={18} color={iconColor} />
                <AppText weight="bold" style={styles.sectionTitle}>Academic Details</AppText>
              </View>

              <RegistrationFormField label="Class" step={step} fieldKey="class_grade" error={fieldErrors.class_grade}>
                <FormSelectPicker
                  value={form.class_grade}
                  onChange={onClassChange}
                  options={classPickerOptions}
                  title="Select Class"
                  placeholder={classPickerOptions.length ? 'Select class' : 'No classes available'}
                  error={Boolean(fieldErrors.class_grade)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Section" step={step} fieldKey="section" error={fieldErrors.section}>
                {form.class_grade && sectionPickerOptions.length > 0 ? (
                  <FormSelectPicker
                    value={form.section}
                    onChange={(value) => onChange('section', value)}
                    options={sectionPickerOptions}
                    title="Select Section"
                    placeholder="Select section"
                    error={Boolean(fieldErrors.section)}
                  />
                ) : (
                  <TextInput
                    style={[styles.input, styles.sectionInput, fieldErrors.section && styles.inputError]}
                    placeholder={form.class_grade ? 'Enter section (A, B, C...)' : 'Select class first'}
                    placeholderTextColor={Theme.colors.textMuted}
                    value={form.section}
                    onChangeText={onSectionChange}
                    autoCapitalize="characters"
                    maxLength={3}
                    editable={Boolean(form.class_grade)}
                  />
                )}
              </RegistrationFormField>

              <RegistrationFormField label="Admission Number" step={step} fieldKey="admission_number" error={fieldErrors.admission_number}>
                <TextInput
                  style={[styles.input, fieldErrors.admission_number && styles.inputError]}
                  placeholder="e.g. ADM2024001"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.admission_number}
                  onChangeText={(text) => onChange('admission_number', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Roll Number" step={step} required={false} error={fieldErrors.roll_number}>
                <TextInput
                  style={[styles.input, fieldErrors.roll_number && styles.inputError]}
                  placeholder="Leave blank to auto-assign"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.roll_number}
                  onChangeText={(text) => onChange('roll_number', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Academic Year" step={step} fieldKey="academic_year" error={fieldErrors.academic_year}>
                <FormSelectPicker
                  value={form.academic_year}
                  onChange={(value) => onChange('academic_year', value)}
                  options={academicYearOptions}
                  title="Select Academic Year"
                  placeholder="YYYY-YY (e.g. 2024-25)"
                  error={Boolean(fieldErrors.academic_year)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Medium of Instruction" step={step} required={false}>
                <FormSelectPicker
                  value={form.medium_of_instruction}
                  onChange={(value) => onChange('medium_of_instruction', value)}
                  options={[...MEDIUM_OF_INSTRUCTION_OPTIONS]}
                  title="Select Medium"
                  placeholder="Default: ENGLISH"
                />
              </RegistrationFormField>

              <RegistrationFormField label="Date of Admission" step={step} required={false}>
                <TouchableOpacity accessibilityRole="button" style={styles.dateBtn} onPress={() => onShowAdmissionDatePicker(true)}>
                  <Calendar size={18} color={Theme.colors.textSec} />
                  <AppText style={styles.dateText}>{form.date_of_admission || 'Select date'}</AppText>
                </TouchableOpacity>
                {showAdmissionDatePicker && (
                  <DateTimePicker
                    value={form.date_of_admission ? new Date(form.date_of_admission) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    onChange={(event, date) => {
                      if (date) {onChange('date_of_admission', date.toISOString().split('T')[0]);}
                      onShowAdmissionDatePicker(false);
                    }}
                  />
                )}
              </RegistrationFormField>

              <RegistrationFormField label="Previous School Name" step={step} required={false}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter previous school name"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.previous_school_name}
                  onChangeText={(text) => onChange('previous_school_name', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Transfer Certificate (TC) Number" step={step} required={false}>
                <TextInput
                  style={styles.input}
                  placeholder="TC Number"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.transfer_certificate_number}
                  onChangeText={(text) => onChange('transfer_certificate_number', text)}
                />
              </RegistrationFormField>
            </View>
          )}

          {/* Step 2: Parent / Guardian Info */}
          {step === 2 && (
            <View>
              <StepRequiredLegend />
              <View style={styles.sectionHeader}>
                <Users size={18} color={iconColor} />
                <AppText weight="bold" style={styles.sectionTitle}>Parent / Guardian Details</AppText>
              </View>

              <RegistrationFormField label="Father / Guardian Name" step={step} fieldKey="father_guardian_name" error={fieldErrors.father_guardian_name}>
                <TextInput
                  style={[styles.input, fieldErrors.father_guardian_name && styles.inputError]}
                  placeholder="Full name"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.father_guardian_name}
                  onChangeText={(text) => onChange('father_guardian_name', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Father Mobile" step={step} fieldKey="father_guardian_mobile" error={fieldErrors.father_guardian_mobile}>
                <TextInput
                  style={[styles.input, fieldErrors.father_guardian_mobile && styles.inputError]}
                  placeholder="10-digit mobile"
                  placeholderTextColor={Theme.colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.father_guardian_mobile}
                  onChangeText={(text) => onChange('father_guardian_mobile', text.replace(/\D/g, '').slice(0, 10))}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Father Occupation" step={step} required={false}>
                <TextInput
                  style={styles.input}
                  placeholder="Occupation"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.father_guardian_occupation}
                  onChangeText={(text) => onChange('father_guardian_occupation', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Mother / Guardian Name" step={step} fieldKey="mother_guardian_name" error={fieldErrors.mother_guardian_name}>
                <TextInput
                  style={[styles.input, fieldErrors.mother_guardian_name && styles.inputError]}
                  placeholder="Full name"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.mother_guardian_name}
                  onChangeText={(text) => onChange('mother_guardian_name', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Mother Mobile" step={step} required={false} error={fieldErrors.mother_guardian_mobile}>
                <TextInput
                  style={[styles.input, fieldErrors.mother_guardian_mobile && styles.inputError]}
                  placeholder="10-digit mobile"
                  placeholderTextColor={Theme.colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.mother_guardian_mobile}
                  onChangeText={(text) => onChange('mother_guardian_mobile', text.replace(/\D/g, '').slice(0, 10))}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Mother Occupation" step={step} required={false}>
                <TextInput
                  style={styles.input}
                  placeholder="Occupation"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.mother_guardian_occupation}
                  onChangeText={(text) => onChange('mother_guardian_occupation', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Parent / Guardian Email" step={step} fieldKey="parent_guardian_email" error={fieldErrors.parent_guardian_email}>
                <TextInput
                  style={[styles.input, fieldErrors.parent_guardian_email && styles.inputError]}
                  placeholder="email@example.com"
                  placeholderTextColor={Theme.colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.parent_guardian_email}
                  onChangeText={(text) => onChange('parent_guardian_email', text)}
                />
              </RegistrationFormField>
            </View>
          )}

          {/* Step 3: Contact & Address */}
          {step === 3 && (
            <View>
              <StepRequiredLegend />
              <View style={styles.sectionHeader}>
                <BookOpen size={18} color={iconColor} />
                <AppText weight="bold" style={styles.sectionTitle}>Current Address</AppText>
              </View>

              <RegistrationFormField label="House No." step={step} fieldKey="house_no" error={fieldErrors.house_no}>
                <TextInput
                  style={[styles.input, fieldErrors.house_no && styles.inputError]}
                  placeholder="e.g. 12-3A"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.house_no}
                  onChangeText={(text) => onChange('house_no', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Street / Locality" step={step} fieldKey="street_locality" error={fieldErrors.street_locality}>
                <TextInput
                  style={[styles.input, fieldErrors.street_locality && styles.inputError]}
                  placeholder="Street or locality"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.street_locality}
                  onChangeText={(text) => onChange('street_locality', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Village / Town / City" step={step} fieldKey="village_town_city" error={fieldErrors.village_town_city}>
                <TextInput
                  style={[styles.input, fieldErrors.village_town_city && styles.inputError]}
                  placeholder="City or village"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.village_town_city}
                  onChangeText={(text) => onChange('village_town_city', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Mandal / Taluk" step={step} fieldKey="mandal_taluk" error={fieldErrors.mandal_taluk}>
                <TextInput
                  style={[styles.input, fieldErrors.mandal_taluk && styles.inputError]}
                  placeholder="Mandal or Taluk"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.mandal_taluk}
                  onChangeText={(text) => onChange('mandal_taluk', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="District" step={step} fieldKey="district" error={fieldErrors.district}>
                <TextInput
                  style={[styles.input, fieldErrors.district && styles.inputError]}
                  placeholder="District"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.district}
                  onChangeText={(text) => onChange('district', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="State" step={step} fieldKey="state" error={fieldErrors.state}>
                <TextInput
                  style={[styles.input, fieldErrors.state && styles.inputError]}
                  placeholder="State"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.state}
                  onChangeText={(text) => onChange('state', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="PIN Code" step={step} fieldKey="pin_code" error={fieldErrors.pin_code}>
                <TextInput
                  style={[styles.input, fieldErrors.pin_code && styles.inputError]}
                  placeholder="6-digit PIN"
                  placeholderTextColor={Theme.colors.textMuted}
                  keyboardType="numeric"
                  maxLength={6}
                  value={form.pin_code}
                  onChangeText={(text) => onChange('pin_code', text.replace(/\D/g, '').slice(0, 6))}
                />
              </RegistrationFormField>

              <View style={[styles.sectionHeader, { marginTop: Theme.spacing.xl }]}>
                <Heart size={18} color={iconColor} />
                <AppText weight="bold" style={styles.sectionTitle}>Health, Emergency & Transport</AppText>
              </View>

              <RegistrationFormField label="Allergies Details" step={step} required={false}>
                <TextInput
                  style={styles.input}
                  placeholder="Any allergies"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.allergies_details}
                  onChangeText={(text) => onChange('allergies_details', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Medical Conditions" step={step} required={false}>
                <TextInput
                  style={styles.input}
                  placeholder="Any medical conditions"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.medical_conditions}
                  onChangeText={(text) => onChange('medical_conditions', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Emergency Contact Name" step={step} fieldKey="emergency_contact_name" error={fieldErrors.emergency_contact_name}>
                <TextInput
                  style={[styles.input, fieldErrors.emergency_contact_name && styles.inputError]}
                  placeholder="Contact person name"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.emergency_contact_name}
                  onChangeText={(text) => onChange('emergency_contact_name', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Emergency Contact Number" step={step} fieldKey="emergency_contact_number" error={fieldErrors.emergency_contact_number}>
                <TextInput
                  style={[styles.input, fieldErrors.emergency_contact_number && styles.inputError]}
                  placeholder="10-digit number"
                  placeholderTextColor={Theme.colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.emergency_contact_number}
                  onChangeText={(text) => onChange('emergency_contact_number', text.replace(/\D/g, '').slice(0, 10))}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Nearest Hospital / Doctor" step={step} required={false}>
                <TextInput
                  style={styles.input}
                  placeholder="Hospital or doctor name"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.nearest_hospital_doctor}
                  onChangeText={(text) => onChange('nearest_hospital_doctor', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Mode of Transport" step={step} required={false} error={fieldErrors.mode_of_transport}>
                <FormSelectPicker
                  value={form.mode_of_transport}
                  onChange={(value) => onChange('mode_of_transport', value)}
                  options={[...MODE_OF_TRANSPORT_OPTIONS]}
                  title="Select Mode of Transport"
                  placeholder="Select transport mode"
                  error={Boolean(fieldErrors.mode_of_transport)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Bus Route / Vehicle Number" step={step} required={false}>
                <TextInput
                  style={styles.input}
                  placeholder="Bus route or vehicle no."
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.bus_route_vehicle_number}
                  onChangeText={(text) => onChange('bus_route_vehicle_number', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Hostel / Day Scholar" step={step} required={false}>
                <FormSelectPicker
                  value={form.hostel_day_scholar}
                  onChange={(value) => onChange('hostel_day_scholar', value)}
                  options={[...HOSTEL_DAY_SCHOLAR_OPTIONS]}
                  title="Hostel / Day Scholar"
                  placeholder="Select option"
                />
              </RegistrationFormField>
            </View>
          )}

          {/* Step 4: Photo & Password */}
          {step === 4 && (
            <View>
              <StepRequiredLegend />
              <View style={styles.sectionHeader}>
                <Camera size={18} color={iconColor} />
                <RequiredSectionTitle title="Student Photograph" required />
              </View>

              {fieldErrors.photo && <AppText style={styles.fieldError}>{fieldErrors.photo}</AppText>}

              <TouchableOpacity accessibilityRole="button" style={styles.photoZone} onPress={onImagePick}>
                {photoPreview ? (
                  <Image source={{ uri: photoPreview }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Camera size={48} color={Theme.colors.textMuted} />
                    <AppText weight="semibold" style={styles.photoText}>Tap to add photo</AppText>
                    <AppText style={styles.photoSubtext}>Camera or Gallery</AppText>
                  </View>
                )}
              </TouchableOpacity>

              <View style={[styles.sectionHeader, { marginTop: Theme.spacing.lg }]}>
                <Check size={18} color={iconColor} />
                <AppText weight="bold" style={styles.sectionTitle}>Login Credentials</AppText>
              </View>

              {/* Password Field with Show/Hide */}
              <RegistrationFormField label="Password" step={4} fieldKey="password" error={fieldErrors.password}>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, fieldErrors.password && styles.inputError, styles.passwordInput]}
                    placeholder="Enter password"
                    placeholderTextColor={Theme.colors.textMuted}
                    secureTextEntry={!showPassword}
                    value={form.password}
                    onChangeText={(text) => onChange('password', text)}
                  />
                  <TouchableOpacity accessibilityRole="button"
                    style={styles.eyeButton}
                    onPress={() => onTogglePassword()}
                  >
                    {showPassword ? <EyeOff size={20} color={Theme.colors.textSec} /> : <Eye size={20} color={Theme.colors.textSec} />}
                  </TouchableOpacity>
                </View>
                {form.password && <PasswordStrength password={form.password} />}
              </RegistrationFormField>

              {/* Confirm Password Field with Show/Hide */}
              <RegistrationFormField label="Retype Password" step={4} fieldKey="confirm_password" error={fieldErrors.confirm_password}>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, fieldErrors.confirm_password && styles.inputError, styles.passwordInput]}
                    placeholder="Retype password"
                    placeholderTextColor={Theme.colors.textMuted}
                    secureTextEntry={!showConfirmPassword}
                    value={form.confirm_password}
                    onChangeText={(text) => onChange('confirm_password', text)}
                  />
                  <TouchableOpacity accessibilityRole="button"
                    style={styles.eyeButton}
                    onPress={() => onToggleConfirmPassword()}
                  >
                    {showConfirmPassword ? <EyeOff size={20} color={Theme.colors.textSec} /> : <Eye size={20} color={Theme.colors.textSec} />}
                  </TouchableOpacity>
                </View>
              </RegistrationFormField>
            </View>
          )}

          {/* Step 5: Preview */}
          {step === 5 && (
            <View>
              <StepRequiredLegend />
              {/* Preview Header */}
              <View style={styles.previewHeader}>
                {photoPreview ? (
                  <Image source={{ uri: photoPreview }} style={styles.previewPhoto} />
                ) : (
                  <View style={styles.previewPhotoPlaceholder}>
                    <AppText style={styles.previewPhotoText}>No Photo</AppText>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <AppText weight="bold" style={styles.previewName}>{form.student_full_name || '—'}</AppText>
                  <AppText style={styles.previewMeta}>
                    Class {form.class_grade || '—'} | Section {form.section || '—'}
                  </AppText>
                  <AppText style={styles.previewMeta}>
                    {form.academic_year || '—'} | Admission: {form.admission_number || '—'}
                  </AppText>
                  <View style={styles.previewBadge}>
                    <AppText weight="bold" style={styles.previewBadgeText}>{form.student_status}</AppText>
                  </View>
                </View>
              </View>

              {/* Personal Details */}
              <View style={styles.previewCard}>
                <View style={styles.previewCardHeader}>
                  <AppText weight="bold" style={styles.previewCardTitle}>Personal Details</AppText>
                </View>
                <View style={styles.previewGrid}>
                  <PreviewField label="First Name" value={form.first_name} />
                  <PreviewField label="Last Name" value={form.last_name} />
                  <PreviewField label="Gender" value={formatGenderLabel(form.gender)} />
                  <PreviewField label="Date of Birth" value={form.date_of_birth} />
                  <PreviewField label="Age" value={form.age ? `${form.age} yrs` : '—'} />
                  <PreviewField label="Blood Group" value={form.blood_group} />
                  <PreviewField label="Nationality" value={form.nationality} />
                  <PreviewField label="Mother Tongue" value={form.mother_tongue} />
                  <PreviewField label="Religion" value={form.religion} />
                  <PreviewField label="Caste" value={form.caste_category} />
                  <PreviewField label="Aadhaar" value={form.aadhaar_number || '—'} />
                  <PreviewField label="Status" value={form.student_status} />
                </View>
              </View>

              {/* Academic Details */}
              <View style={styles.previewCard}>
                <View style={styles.previewCardHeader}>
                  <AppText weight="bold" style={styles.previewCardTitle}>Academic Details</AppText>
                </View>
                <View style={styles.previewGrid}>
                  <PreviewField label="Class" value={form.class_grade} />
                  <PreviewField label="Section" value={form.section} />
                  <PreviewField label="Admission No." value={form.admission_number} />
                  <PreviewField label="Roll Number" value={form.roll_number} />
                  <PreviewField label="Academic Year" value={form.academic_year} />
                  <PreviewField label="Medium" value={formatOptionLabel(form.medium_of_instruction, MEDIUM_OF_INSTRUCTION_OPTIONS)} />
                  <PreviewField label="Date of Admission" value={form.date_of_admission} />
                  <PreviewField label="Previous School" value={form.previous_school_name} />
                  <PreviewField label="TC Number" value={form.transfer_certificate_number} />
                </View>
              </View>

              {/* Parent Details */}
              <View style={styles.previewCard}>
                <View style={styles.previewCardHeader}>
                  <AppText weight="bold" style={styles.previewCardTitle}>Parent / Guardian Details</AppText>
                </View>
                <View style={styles.previewGrid}>
                  <PreviewField label="Father Name" value={form.father_guardian_name} />
                  <PreviewField label="Father Mobile" value={form.father_guardian_mobile} />
                  <PreviewField label="Father Occupation" value={form.father_guardian_occupation} />
                  <PreviewField label="Mother Name" value={form.mother_guardian_name} />
                  <PreviewField label="Mother Mobile" value={form.mother_guardian_mobile} />
                  <PreviewField label="Mother Occupation" value={form.mother_guardian_occupation} />
                  <PreviewField label="Parent Email" value={form.parent_guardian_email} />
                </View>
              </View>

              {/* Address */}
              <View style={styles.previewCard}>
                <View style={styles.previewCardHeader}>
                  <AppText weight="bold" style={styles.previewCardTitle}>Address</AppText>
                </View>
                <View style={styles.previewGrid}>
                  <PreviewField label="House No." value={form.house_no} />
                  <PreviewField label="Street" value={form.street_locality} />
                  <PreviewField label="City" value={form.village_town_city} />
                  <PreviewField label="Mandal/Taluk" value={form.mandal_taluk} />
                  <PreviewField label="District" value={form.district} />
                  <PreviewField label="State" value={form.state} />
                  <PreviewField label="PIN Code" value={form.pin_code} />
                </View>
              </View>

              {/* Health & Transport */}
              <View style={styles.previewCard}>
                <View style={styles.previewCardHeader}>
                  <AppText weight="bold" style={styles.previewCardTitle}>Health & Transport</AppText>
                </View>
                <View style={styles.previewGrid}>
                  <PreviewField label="Allergies" value={form.allergies_details} />
                  <PreviewField label="Medical Conditions" value={form.medical_conditions} />
                  <PreviewField label="Emergency Contact" value={form.emergency_contact_name} />
                  <PreviewField label="Emergency Mobile" value={form.emergency_contact_number} />
                  <PreviewField label="Nearest Hospital" value={form.nearest_hospital_doctor} />
                  <PreviewField label="Mode of Transport" value={formatOptionLabel(form.mode_of_transport, MODE_OF_TRANSPORT_OPTIONS)} />
                  <PreviewField label="Bus Route" value={form.bus_route_vehicle_number} />
                  <PreviewField label="Hostel/Day Scholar" value={formatOptionLabel(form.hostel_day_scholar, HOSTEL_DAY_SCHOLAR_OPTIONS)} />
                </View>
              </View>

              <View style={styles.previewFooter}>
                <AppText weight="semibold" style={styles.previewFooterText}>
                  Please review all details carefully before submitting.
                </AppText>
              </View>
            </View>
          )}

          
    </>
  );
}
