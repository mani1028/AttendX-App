import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import BloodGroupPicker from '../../common/BloodGroupPicker';
import type { TeacherRegistrationStyles } from './teacherRegistrationStyles';
import { teacherRegistrationStyles as defaultStyles } from './teacherRegistrationStyles';
import FormField from './FormField';
import PasswordStrength from './PasswordStrength';
import PreviewField from './PreviewField';
import type { FormData } from './types';

const DESIGNATION_OPTIONS = [
  'Teacher',
  'Senior Teacher',
  'Head of Department',
  'Vice Director',
  'Director',
  'Lab Assistant',
  'Sports Teacher',
  'Special Educator',
  'Accountant',
];

const QUALIFICATION_OPTIONS = [
  'B.Ed',
  'M.Ed',
  'B.Sc + B.Ed',
  'M.Sc + B.Ed',
  'BA + B.Ed',
  'MA + B.Ed',
  'Ph.D',
  'Other',
];

export interface TeacherRegistrationFormStepsProps {
  step: number;
  formData: FormData;
  fieldErrors: Record<string, string>;
  styles?: TeacherRegistrationStyles;
  photoPreview: string | null;
  showDOBPicker: boolean;
  showJoiningPicker: boolean;
  otp: string;
  otpSent: boolean;
  emailVerified: boolean;
  otpSending: boolean;
  otpVerifying: boolean;
  onChange: (name: keyof FormData, value: string) => void;
  onOtpChange: (value: string) => void;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
  onImagePick: () => void;
  onShowDOBPicker: (show: boolean) => void;
  onShowJoiningPicker: (show: boolean) => void;
}

export default function TeacherRegistrationFormSteps({
  step,
  formData,
  fieldErrors,
  styles = defaultStyles,
  photoPreview,
  showDOBPicker,
  showJoiningPicker,
  otp,
  otpSent,
  emailVerified,
  otpSending,
  otpVerifying,
  onChange,
  onOtpChange,
  onSendOtp,
  onVerifyOtp,
  onImagePick,
  onShowDOBPicker,
  onShowJoiningPicker,
}: TeacherRegistrationFormStepsProps) {
  return (
    <>
      {step === 0 && (
        <View>
          <Text style={styles.sectionTitle}>Personal Details</Text>

          <FormField label="Branch ID">
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={formData.branch_id}
              editable={false}
            />
          </FormField>

          <FormField label="Full Name" required error={fieldErrors.teacher_full_name}>
            <TextInput
              style={[styles.input, fieldErrors.teacher_full_name && styles.inputError]}
              placeholder="e.g. Ramesh Kumar"
              value={formData.teacher_full_name}
              onChangeText={(text) => onChange('teacher_full_name', text)}
            />
          </FormField>

          <FormField label="Gender" required error={fieldErrors.gender}>
            <View style={styles.genderContainer}>
              {['Male', 'Female', 'Other'].map((g) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={g}
                  style={[styles.genderBtn, formData.gender === g && styles.genderBtnActive]}
                  onPress={() => onChange('gender', g)}
                >
                  <Text style={[styles.genderText, formData.gender === g && styles.genderTextActive]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </FormField>

          <FormField label="Date of Birth" required error={fieldErrors.date_of_birth}>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.dateBtn}
              onPress={() => onShowDOBPicker(true)}
            >
              <Text style={styles.dateText}>{formData.date_of_birth || 'Select date'}</Text>
            </TouchableOpacity>
            {showDOBPicker && (
              <DateTimePicker
                value={formData.date_of_birth ? new Date(formData.date_of_birth) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(_event, date) => {
                  if (date) { onChange('date_of_birth', date.toISOString().split('T')[0]); }
                  onShowDOBPicker(false);
                }}
              />
            )}
          </FormField>

          <FormField label="Age (auto-calculated)">
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={formData.age ? `${formData.age} years` : 'Select DOB above'}
              editable={false}
            />
          </FormField>

          <FormField label="Blood Group" error={fieldErrors.blood_group}>
            <BloodGroupPicker
              value={formData.blood_group}
              onChange={(value) => onChange('blood_group', value)}
              error={Boolean(fieldErrors.blood_group)}
            />
          </FormField>

          <FormField label="Nationality" required error={fieldErrors.nationality}>
            <TextInput
              style={[styles.input, fieldErrors.nationality && styles.inputError]}
              value={formData.nationality}
              onChangeText={(text) => onChange('nationality', text)}
            />
          </FormField>

          <FormField label="Mother Tongue" required error={fieldErrors.mother_tongue}>
            <TextInput
              style={[styles.input, fieldErrors.mother_tongue && styles.inputError]}
              placeholder="e.g. Telugu"
              value={formData.mother_tongue}
              onChangeText={(text) => onChange('mother_tongue', text)}
            />
          </FormField>

          <FormField label="Email ID" required error={fieldErrors.email_id}>
            <View style={styles.rowWithButton}>
              <TextInput
                style={[
                  styles.input,
                  styles.flex1,
                  fieldErrors.email_id && styles.inputError,
                  emailVerified && styles.disabledInput,
                ]}
                placeholder="teacher@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email_id}
                onChangeText={(text) => onChange('email_id', text)}
                editable={!emailVerified}
              />
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.verifyBtn, (otpSending || emailVerified) && styles.verifyBtnDisabled]}
                onPress={onSendOtp}
                disabled={otpSending || emailVerified}
              >
                <Text style={styles.verifyBtnText}>
                  {emailVerified ? 'Verified' : otpSending ? 'Sending...' : 'Verify'}
                </Text>
              </TouchableOpacity>
            </View>
            {fieldErrors.email_id && <Text style={styles.fieldError}>{fieldErrors.email_id}</Text>}
          </FormField>

          {otpSent && !emailVerified && (
            <View style={styles.otpRow}>
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="Enter OTP"
                keyboardType="numeric"
                value={otp}
                onChangeText={onOtpChange}
              />
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.verifyBtn, styles.verifyOtpBtn]}
                onPress={onVerifyOtp}
                disabled={otpVerifying}
              >
                <Text style={styles.verifyBtnText}>
                  {otpVerifying ? 'Verifying...' : 'Verify OTP'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {emailVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          )}

          <FormField label="Religion">
            <TextInput
              style={styles.input}
              value={formData.religion}
              onChangeText={(text) => onChange('religion', text)}
            />
          </FormField>

          <FormField label="Marital Status">
            <TextInput
              style={styles.input}
              value={formData.marital_status}
              onChangeText={(text) => onChange('marital_status', text)}
            />
          </FormField>

          <FormField label="Aadhaar Number">
            <TextInput
              style={[styles.input, fieldErrors.aadhaar_number && styles.inputError]}
              placeholder="12-digit Aadhaar"
              keyboardType="numeric"
              maxLength={12}
              value={formData.aadhaar_number}
              onChangeText={(text) => onChange('aadhaar_number', text)}
            />
            {fieldErrors.aadhaar_number && <Text style={styles.fieldError}>{fieldErrors.aadhaar_number}</Text>}
          </FormField>

          <FormField label="Teacher Photo" required error={fieldErrors.teacher_photograph}>
            <TouchableOpacity accessibilityRole="button" style={styles.photoZone} onPress={onImagePick}>
              {photoPreview ? (
                <Image source={{ uri: photoPreview }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoIcon}>📷</Text>
                  <Text style={styles.photoText}>Tap to add photo</Text>
                  <Text style={styles.photoSubtext}>Camera or Gallery</Text>
                </View>
              )}
            </TouchableOpacity>
          </FormField>
        </View>
      )}

      {step === 1 && (
        <View>
          <Text style={styles.sectionTitle}>Contact & Address</Text>

          <FormField label="Mobile Number" required error={fieldErrors.mobile_number}>
            <TextInput
              style={[styles.input, fieldErrors.mobile_number && styles.inputError]}
              placeholder="10-digit mobile"
              keyboardType="phone-pad"
              maxLength={10}
              value={formData.mobile_number}
              onChangeText={(text) => onChange('mobile_number', text.replace(/\D/g, '').slice(0, 10))}
            />
          </FormField>

          <FormField label="Alternate Mobile">
            <TextInput
              style={styles.input}
              placeholder="Optional"
              keyboardType="phone-pad"
              maxLength={10}
              value={formData.alternate_mobile_number}
              onChangeText={(text) => onChange('alternate_mobile_number', text.replace(/\D/g, '').slice(0, 10))}
            />
          </FormField>

          <FormField label="House No" required error={fieldErrors.house_no}>
            <TextInput
              style={[styles.input, fieldErrors.house_no && styles.inputError]}
              value={formData.house_no}
              onChangeText={(text) => onChange('house_no', text)}
            />
          </FormField>

          <FormField label="Street / Locality" required error={fieldErrors.street_locality}>
            <TextInput
              style={[styles.input, fieldErrors.street_locality && styles.inputError]}
              value={formData.street_locality}
              onChangeText={(text) => onChange('street_locality', text)}
            />
          </FormField>

          <FormField label="City / Town" required error={fieldErrors.village_town_city}>
            <TextInput
              style={[styles.input, fieldErrors.village_town_city && styles.inputError]}
              value={formData.village_town_city}
              onChangeText={(text) => onChange('village_town_city', text)}
            />
          </FormField>

          <FormField label="Mandal / Taluk" required error={fieldErrors.mandal_taluk}>
            <TextInput
              style={[styles.input, fieldErrors.mandal_taluk && styles.inputError]}
              value={formData.mandal_taluk}
              onChangeText={(text) => onChange('mandal_taluk', text)}
            />
          </FormField>

          <FormField label="District" required error={fieldErrors.district}>
            <TextInput
              style={[styles.input, fieldErrors.district && styles.inputError]}
              value={formData.district}
              onChangeText={(text) => onChange('district', text)}
            />
          </FormField>

          <FormField label="State" required error={fieldErrors.state}>
            <TextInput
              style={[styles.input, fieldErrors.state && styles.inputError]}
              value={formData.state}
              onChangeText={(text) => onChange('state', text)}
            />
          </FormField>

          <FormField label="Pin Code" required error={fieldErrors.pin_code}>
            <TextInput
              style={[styles.input, fieldErrors.pin_code && styles.inputError]}
              placeholder="6-digit PIN"
              keyboardType="numeric"
              maxLength={6}
              value={formData.pin_code}
              onChangeText={(text) => onChange('pin_code', text.replace(/\D/g, '').slice(0, 6))}
            />
          </FormField>
        </View>
      )}

      {step === 2 && (
        <View>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>

          <FormField label="Contact Name" required error={fieldErrors.emergency_contact_name}>
            <TextInput
              style={[styles.input, fieldErrors.emergency_contact_name && styles.inputError]}
              value={formData.emergency_contact_name}
              onChangeText={(text) => onChange('emergency_contact_name', text)}
            />
          </FormField>

          <FormField label="Contact Number" required error={fieldErrors.emergency_contact_number}>
            <TextInput
              style={[styles.input, fieldErrors.emergency_contact_number && styles.inputError]}
              placeholder="10-digit number"
              keyboardType="phone-pad"
              maxLength={10}
              value={formData.emergency_contact_number}
              onChangeText={(text) => onChange('emergency_contact_number', text.replace(/\D/g, '').slice(0, 10))}
            />
          </FormField>

          <FormField label="Relationship" required error={fieldErrors.emergency_contact_relationship}>
            <TextInput
              style={[styles.input, fieldErrors.emergency_contact_relationship && styles.inputError]}
              placeholder="e.g. Spouse, Parent, Sibling"
              value={formData.emergency_contact_relationship}
              onChangeText={(text) => onChange('emergency_contact_relationship', text)}
            />
          </FormField>
        </View>
      )}

      {step === 3 && (
        <View>
          <Text style={styles.sectionTitle}>Employment Details</Text>

          <FormField label="Employee ID">
            <TextInput
              style={[styles.input, styles.disabledInput]}
              placeholder="Assigned after registration"
              value={formData.employee_id}
              editable={false}
            />
            <Text style={styles.helperText}>Employee ID will be assigned after save.</Text>
          </FormField>

          <FormField label="Designation" required error={fieldErrors.designation}>
            <View style={styles.pickerContainer}>
              {DESIGNATION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={opt}
                  style={[styles.pickerOption, formData.designation === opt && styles.pickerOptionActive]}
                  onPress={() => onChange('designation', opt)}
                >
                  <Text style={[styles.pickerText, formData.designation === opt && styles.pickerTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {fieldErrors.designation && <Text style={styles.fieldError}>{fieldErrors.designation}</Text>}
          </FormField>

          <FormField label="Department / Subject" required error={fieldErrors.department_subject}>
            <TextInput
              style={[styles.input, fieldErrors.department_subject && styles.inputError]}
              placeholder="Enter department or subject"
              value={formData.department_subject}
              onChangeText={(text) => onChange('department_subject', text)}
            />
          </FormField>

          <FormField label="Qualification">
            <View style={styles.pickerContainer}>
              {QUALIFICATION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={opt}
                  style={[styles.pickerOption, formData.qualification === opt && styles.pickerOptionActive]}
                  onPress={() => onChange('qualification', opt)}
                >
                  <Text style={[styles.pickerText, formData.qualification === opt && styles.pickerTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </FormField>

          <FormField label="Experience (Years)">
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0"
              value={formData.experience_years}
              onChangeText={(text) => onChange('experience_years', text)}
            />
          </FormField>

          <FormField label="Date of Joining" required error={fieldErrors.date_of_joining}>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.dateBtn}
              onPress={() => onShowJoiningPicker(true)}
            >
              <Text style={styles.dateText}>{formData.date_of_joining || 'Select date'}</Text>
            </TouchableOpacity>
            {showJoiningPicker && (
              <DateTimePicker
                value={formData.date_of_joining ? new Date(formData.date_of_joining) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(_event, date) => {
                  if (date) { onChange('date_of_joining', date.toISOString().split('T')[0]); }
                  onShowJoiningPicker(false);
                }}
              />
            )}
          </FormField>

          <FormField label="Employment Type">
            <View style={styles.pickerContainer}>
              {['FULL_TIME', 'PART_TIME', 'CONTRACTOR'].map((opt) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={opt}
                  style={[styles.pickerOption, formData.employment_type === opt && styles.pickerOptionActive]}
                  onPress={() => onChange('employment_type', opt)}
                >
                  <Text style={[styles.pickerText, formData.employment_type === opt && styles.pickerTextActive]}>
                    {opt.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </FormField>

          <FormField label="Teacher Status">
            <View style={styles.pickerContainer}>
              {['ACTIVE', 'INACTIVE'].map((opt) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={opt}
                  style={[styles.pickerOption, formData.teacher_status === opt && styles.pickerOptionActive]}
                  onPress={() => onChange('teacher_status', opt)}
                >
                  <Text style={[styles.pickerText, formData.teacher_status === opt && styles.pickerTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </FormField>

          <FormField label="Password" required error={fieldErrors.password}>
            <TextInput
              style={[styles.input, fieldErrors.password && styles.inputError]}
              placeholder="Min. 6 characters"
              secureTextEntry
              value={formData.password}
              onChangeText={(text) => onChange('password', text)}
            />
            {formData.password ? <PasswordStrength password={formData.password} /> : null}
            {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}
          </FormField>

          <FormField label="Salary Amount">
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Optional"
              value={formData.salary_amount}
              onChangeText={(text) => onChange('salary_amount', text)}
            />
          </FormField>
        </View>
      )}

      {step === 4 && (
        <View>
          <Text style={styles.sectionTitle}>Final Review</Text>
          <Text style={styles.previewNote}>Please verify all details before submitting.</Text>

          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={styles.previewPhoto}>
                {photoPreview ? (
                  <Image source={{ uri: photoPreview }} style={styles.previewPhotoImage} />
                ) : (
                  <View style={styles.previewPhotoPlaceholder}>
                    <Text style={styles.previewPhotoText}>
                      {formData.teacher_full_name ? formData.teacher_full_name.charAt(0).toUpperCase() : 'T'}
                    </Text>
                  </View>
                )}
              </View>
              <View>
                <Text style={styles.previewName}>{formData.teacher_full_name || '—'}</Text>
                <Text style={styles.previewDesignation}>
                  {formData.designation || '—'} · {formData.department_subject || '—'}
                </Text>
                <Text style={styles.previewEmail}>{formData.email_id || '—'}</Text>
                <View
                  style={[
                    styles.previewStatus,
                    formData.teacher_status === 'ACTIVE' ? styles.previewStatusActive : styles.previewStatusInactive,
                  ]}
                >
                  <Text style={styles.previewStatusText}>{formData.teacher_status}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.previewSectionTitle}>Personal Information</Text>
            <View style={styles.previewGrid}>
              <PreviewField label="Gender" value={formData.gender} />
              <PreviewField label="Date of Birth" value={formData.date_of_birth} />
              <PreviewField label="Age" value={formData.age} />
              <PreviewField label="Blood Group" value={formData.blood_group} />
              <PreviewField label="Nationality" value={formData.nationality} />
              <PreviewField label="Mother Tongue" value={formData.mother_tongue} />
              <PreviewField label="Religion" value={formData.religion} />
              <PreviewField label="Marital Status" value={formData.marital_status} />
              <PreviewField label="Aadhaar Number" value={formData.aadhaar_number} />
            </View>

            <Text style={styles.previewSectionTitle}>Contact & Address</Text>
            <View style={styles.previewGrid}>
              <PreviewField label="Mobile" value={formData.mobile_number} />
              <PreviewField label="Alt Mobile" value={formData.alternate_mobile_number} />
              <PreviewField label="House No" value={formData.house_no} />
              <PreviewField label="Street" value={formData.street_locality} />
              <PreviewField label="City" value={formData.village_town_city} />
              <PreviewField label="Mandal/Taluk" value={formData.mandal_taluk} />
              <PreviewField label="District" value={formData.district} />
              <PreviewField label="State" value={formData.state} />
              <PreviewField label="Pin Code" value={formData.pin_code} />
            </View>

            <Text style={styles.previewSectionTitle}>Emergency Contact</Text>
            <View style={styles.previewGrid}>
              <PreviewField label="Contact Name" value={formData.emergency_contact_name} />
              <PreviewField label="Contact Number" value={formData.emergency_contact_number} />
              <PreviewField label="Relationship" value={formData.emergency_contact_relationship} />
            </View>

            <Text style={styles.previewSectionTitle}>Employment Details</Text>
            <View style={styles.previewGrid}>
              <PreviewField label="Employee ID" value={formData.employee_id} />
              <PreviewField label="Designation" value={formData.designation} />
              <PreviewField label="Department" value={formData.department_subject} />
              <PreviewField label="Qualification" value={formData.qualification} />
              <PreviewField label="Experience" value={formData.experience_years ? `${formData.experience_years} yrs` : '—'} />
              <PreviewField label="Date of Joining" value={formData.date_of_joining} />
              <PreviewField label="Employment Type" value={formData.employment_type?.replace('_', ' ')} />
              <PreviewField label="Salary" value={formData.salary_amount} />
              <PreviewField label="Branch ID" value={formData.branch_id} />
            </View>
          </View>

          <View style={styles.inlineNote}>
            <Text style={styles.inlineNoteText}>
              Branch: <Text style={styles.inlineNoteBold}>{formData.branch_id || '—'}</Text> • Email:{' '}
              <Text style={styles.inlineNoteBold}>{formData.email_id || '—'}</Text> • Employee ID:{' '}
              <Text style={styles.inlineNoteBold}>{formData.employee_id || '—'}</Text>
            </Text>
          </View>
        </View>
      )}
    </>
  );
}
