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
  X,
  Calendar,
  Check,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Users,
  User,
} from 'lucide-react-native';
import AppText from '../../common/AppText';
import { BLOOD_GROUPS } from '../../../utils/studentRegistrationValidation';
import { C, Theme } from '../../../theme/tokens';
import EnrollmentStepper from './EnrollmentStepper';
import { studentManagementStyles as styles } from './styles';
import { STEPS, type ClassItem, type FormData } from './types';

export interface StudentEnrollmentFormProps {
  step: number;
  formData: FormData;
  fieldErrors: Record<string, string>;
  loading: boolean;
  serverError: string;
  serverSuccess: string;
  classes: ClassItem[];
  selectedPhoto: any;
  showDatePicker: boolean;
  dateType: 'dob' | 'doa';
  onFormDataChange: (updater: (prev: FormData) => FormData) => void;
  onFieldErrorsChange: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  onSelectedPhotoChange: (photo: any) => void;
  onShowDatePickerChange: (show: boolean) => void;
  onDateTypeChange: (type: 'dob' | 'doa') => void;
  onPrevStep: () => void;
  onNextOrSubmit: () => void;
  onPickImage: (type: 'camera' | 'library') => void;
  onDateChange: (event: any, selectedDate?: Date) => void;
}

export default function StudentEnrollmentForm({
  step,
  formData,
  fieldErrors,
  loading,
  serverError,
  serverSuccess,
  classes,
  selectedPhoto,
  showDatePicker,
  dateType,
  onFormDataChange,
  onFieldErrorsChange,
  onSelectedPhotoChange,
  onShowDatePickerChange,
  onDateTypeChange,
  onPrevStep,
  onNextOrSubmit,
  onPickImage,
  onDateChange,
}: StudentEnrollmentFormProps) {
  const setFormData = onFormDataChange;
  const setFieldErrors = onFieldErrorsChange;
  const setSelectedPhoto = onSelectedPhotoChange;
  const setShowDatePicker = onShowDatePickerChange;
  const setDateType = onDateTypeChange;
  const prevStep = onPrevStep;
  const handleSubmit = onNextOrSubmit;
  const nextStep = onNextOrSubmit;
  const handlePickImage = onPickImage;
  const handleDateChange = onDateChange;

  return (
<View style={styles.enrollmentContainer}>
  <EnrollmentStepper currentStep={step} />

  <View style={styles.stepForm}>
    {step === 0 && (
      <View style={styles.formGrid}>
        <AppText style={styles.stepTitle} weight="bold">Personal Information</AppText>
        <View style={styles.row}>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">First Name <AppText style={styles.requiredStar}>*</AppText></AppText>
            <TextInput
              style={[styles.input, fieldErrors.first_name && styles.inputError]}
              value={formData.first_name}
              onChangeText={v => setFormData(p => ({ ...p, first_name: v }))}
              placeholder="Enter first name"
            />
            {fieldErrors.first_name && <AppText style={styles.errorText}>{fieldErrors.first_name}</AppText>}
          </View>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Last Name <AppText style={styles.requiredStar}>*</AppText></AppText>
            <TextInput
              style={[styles.input, fieldErrors.last_name && styles.inputError]}
              value={formData.last_name}
              onChangeText={v => setFormData(p => ({ ...p, last_name: v }))}
              placeholder="Enter last name"
            />
            {fieldErrors.last_name && <AppText style={styles.errorText}>{fieldErrors.last_name}</AppText>}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Gender <AppText style={styles.requiredStar}>*</AppText></AppText>
            <View style={[styles.pickerContainer, fieldErrors.gender && styles.inputError]}>
              <Picker
                selectedValue={formData.gender}
                onValueChange={v => setFormData(p => ({ ...p, gender: v }))}
                style={styles.picker}
              >
                <Picker.Item label="Select Gender" value="" />
                <Picker.Item label="Male" value="MALE" />
                <Picker.Item label="Female" value="FEMALE" />
                <Picker.Item label="Other" value="OTHER" />
              </Picker>
            </View>
            {fieldErrors.gender && <AppText style={styles.errorText}>{fieldErrors.gender}</AppText>}
          </View>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Date of Birth <AppText style={styles.requiredStar}>*</AppText></AppText>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.input, styles.dateInput, fieldErrors.date_of_birth && styles.inputError]}
              onPress={() => { setDateType('dob'); setShowDatePicker(true); }}
            >
              <AppText style={formData.date_of_birth ? styles.inputText : styles.placeholderText}>
                {formData.date_of_birth || 'YYYY-MM-DD'}
              </AppText>
              <Calendar size={18} color={C.t3} />
            </TouchableOpacity>
            {fieldErrors.date_of_birth && <AppText style={styles.errorText}>{fieldErrors.date_of_birth}</AppText>}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Nationality <AppText style={styles.requiredStar}>*</AppText></AppText>
            <TextInput
              style={[styles.input, fieldErrors.nationality && styles.inputError]}
              value={formData.nationality}
              onChangeText={v => setFormData(p => ({ ...p, nationality: v }))}
              placeholder="e.g. Indian"
            />
            {fieldErrors.nationality && <AppText style={styles.errorText}>{fieldErrors.nationality}</AppText>}
          </View>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Mother Tongue</AppText>
            <TextInput
              style={styles.input}
              value={formData.mother_tongue}
              onChangeText={v => setFormData(p => ({ ...p, mother_tongue: v }))}
              placeholder="e.g. Telugu"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Aadhaar Number</AppText>
            <TextInput
              style={[styles.input, fieldErrors.aadhaar_number && styles.inputError]}
              value={formData.aadhaar_number}
              onChangeText={v => setFormData(p => ({ ...p, aadhaar_number: v }))}
              placeholder="12 digit number"
              keyboardType="number-pad"
              maxLength={12}
            />
            {fieldErrors.aadhaar_number && <AppText style={styles.errorText}>{fieldErrors.aadhaar_number}</AppText>}
          </View>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Blood Group</AppText>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.blood_group}
                onValueChange={v => setFormData(p => ({ ...p, blood_group: v }))}
                style={styles.picker}
              >
                <Picker.Item label="Select" value="" />
                {BLOOD_GROUPS.map(bg => (
                  <Picker.Item key={bg} label={bg} value={bg} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Religion</AppText>
            <TextInput
              style={styles.input}
              value={formData.religion}
              onChangeText={v => setFormData(p => ({ ...p, religion: v }))}
              placeholder="e.g. Hindu, Muslim, Christian"
            />
          </View>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Caste Category</AppText>
            <TextInput
              style={styles.input}
              value={formData.caste_category}
              onChangeText={v => setFormData(p => ({ ...p, caste_category: v }))}
              placeholder="e.g. General, OBC, SC, ST"
            />
          </View>
        </View>
      </View>
    )}

    {step === 1 && (
      <View style={styles.formGrid}>
        <AppText style={styles.stepTitle} weight="bold">Academic Details</AppText>
        <View style={styles.row}>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Class <AppText style={styles.requiredStar}>*</AppText></AppText>
            <View style={[styles.pickerContainer, fieldErrors.class_grade && styles.inputError]}>
              <Picker
                selectedValue={formData.class_grade}
                onValueChange={v => setFormData(p => ({ ...p, class_grade: v }))}
                style={styles.picker}
              >
                <Picker.Item label="Select Class" value="" />
                {Array.from(new Set(classes.map(c => c.class_grade))).sort().map(cg => (
                  <Picker.Item key={cg} label={cg} value={cg} />
                ))}
              </Picker>
            </View>
            {fieldErrors.class_grade && <AppText style={styles.errorText}>{fieldErrors.class_grade}</AppText>}
          </View>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Section <AppText style={styles.requiredStar}>*</AppText></AppText>
            <View style={[styles.pickerContainer, fieldErrors.section && styles.inputError]}>
              <Picker
                selectedValue={formData.section}
                onValueChange={v => setFormData(p => ({ ...p, section: v }))}
                style={styles.picker}
              >
                <Picker.Item label="Select Section" value="" />
                {classes
                  .filter(c => c.class_grade === formData.class_grade)
                  .map(c => (
                    <Picker.Item key={c.section} label={c.section.toUpperCase()} value={c.section} />
                  ))}
              </Picker>
            </View>
            {fieldErrors.section && <AppText style={styles.errorText}>{fieldErrors.section}</AppText>}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Admission Number <AppText style={styles.requiredStar}>*</AppText></AppText>
            <TextInput
              style={[styles.input, fieldErrors.admission_number && styles.inputError]}
              value={formData.admission_number}
              onChangeText={v => setFormData(p => ({ ...p, admission_number: v }))}
              placeholder="Enter admission #"
            />
            {fieldErrors.admission_number && <AppText style={styles.errorText}>{fieldErrors.admission_number}</AppText>}
          </View>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Roll Number</AppText>
            <TextInput
              style={[styles.input, fieldErrors.roll_number && styles.inputError]}
              value={formData.roll_number}
              onChangeText={v => setFormData(p => ({ ...p, roll_number: v }))}
              placeholder="Enter roll #"
            />
            {fieldErrors.roll_number && <AppText style={styles.errorText}>{fieldErrors.roll_number}</AppText>}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Academic Year <AppText style={styles.requiredStar}>*</AppText></AppText>
            <TextInput
              style={[styles.input, fieldErrors.academic_year && styles.inputError]}
              value={formData.academic_year}
              onChangeText={v => setFormData(p => ({ ...p, academic_year: v }))}
              placeholder="YYYY-YY (e.g. 2024-25)"
            />
            {fieldErrors.academic_year && <AppText style={styles.errorText}>{fieldErrors.academic_year}</AppText>}
          </View>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Date of Admission</AppText>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.input, styles.dateInput]}
              onPress={() => { setDateType('doa'); setShowDatePicker(true); }}
            >
              <AppText style={styles.inputText}>{formData.date_of_admission}</AppText>
              <Calendar size={18} color={C.t3} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <AppText style={styles.label} weight="semibold">Previous School Name</AppText>
          <TextInput
            style={styles.input}
            value={formData.previous_school_name}
            onChangeText={v => setFormData(p => ({ ...p, previous_school_name: v }))}
            placeholder="Name of last attended school"
          />
        </View>
      </View>
    )}

    {step === 2 && (
      <View style={styles.formGrid}>
        <AppText style={styles.stepTitle} weight="bold">Guardian Information</AppText>
        <View style={styles.formGroup}>
          <AppText style={styles.label} weight="semibold">Father/Guardian Name <AppText style={styles.requiredStar}>*</AppText></AppText>
          <TextInput
            style={[styles.input, fieldErrors.father_guardian_name && styles.inputError]}
            value={formData.father_guardian_name}
            onChangeText={v => setFormData(p => ({ ...p, father_guardian_name: v }))}
            placeholder="Full name"
          />
          {fieldErrors.father_guardian_name && <AppText style={styles.errorText}>{fieldErrors.father_guardian_name}</AppText>}
        </View>
        <View style={styles.row}>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Father Mobile <AppText style={styles.requiredStar}>*</AppText></AppText>
            <TextInput
              style={[styles.input, fieldErrors.father_guardian_mobile && styles.inputError]}
              value={formData.father_guardian_mobile}
              onChangeText={v => setFormData(p => ({ ...p, father_guardian_mobile: v }))}
              placeholder="10 digit number"
              keyboardType="phone-pad"
              maxLength={10}
            />
            {fieldErrors.father_guardian_mobile && <AppText style={styles.errorText}>{fieldErrors.father_guardian_mobile}</AppText>}
          </View>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Occupation</AppText>
            <TextInput
              style={styles.input}
              value={formData.father_guardian_occupation}
              onChangeText={v => setFormData(p => ({ ...p, father_guardian_occupation: v }))}
              placeholder="e.g. Business, Service"
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.formGroup}>
          <AppText style={styles.label} weight="semibold">Mother/Guardian Name <AppText style={styles.requiredStar}>*</AppText></AppText>
          <TextInput
            style={[styles.input, fieldErrors.mother_guardian_name && styles.inputError]}
            value={formData.mother_guardian_name}
            onChangeText={v => setFormData(p => ({ ...p, mother_guardian_name: v }))}
            placeholder="Full name"
          />
          {fieldErrors.mother_guardian_name && <AppText style={styles.errorText}>{fieldErrors.mother_guardian_name}</AppText>}
        </View>
        <View style={styles.row}>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Mobile Number</AppText>
            <TextInput
              style={[styles.input, fieldErrors.mother_guardian_mobile && styles.inputError]}
              value={formData.mother_guardian_mobile}
              onChangeText={v => setFormData(p => ({ ...p, mother_guardian_mobile: v }))}
              placeholder="10 digit number"
              keyboardType="phone-pad"
              maxLength={10}
            />
            {fieldErrors.mother_guardian_mobile && <AppText style={styles.errorText}>{fieldErrors.mother_guardian_mobile}</AppText>}
          </View>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Occupation</AppText>
            <TextInput
              style={styles.input}
              value={formData.mother_guardian_occupation}
              onChangeText={v => setFormData(p => ({ ...p, mother_guardian_occupation: v }))}
              placeholder="e.g. Homemaker, Teacher"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <AppText style={styles.label} weight="semibold">Parent / Guardian Email <AppText style={styles.requiredStar}>*</AppText></AppText>
          <TextInput
            style={[styles.input, fieldErrors.parent_guardian_email && styles.inputError]}
            value={formData.parent_guardian_email}
            onChangeText={v => setFormData(p => ({ ...p, parent_guardian_email: v }))}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {fieldErrors.parent_guardian_email && <AppText style={styles.errorText}>{fieldErrors.parent_guardian_email}</AppText>}
        </View>
      </View>
    )}

    {step === 3 && (
      <View style={styles.formGrid}>
        <AppText style={styles.stepTitle} weight="bold">Current Address</AppText>
        <View style={styles.row}>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">House No. <AppText style={styles.requiredStar}>*</AppText></AppText>
            <TextInput
              style={[styles.input, fieldErrors.house_no && styles.inputError]}
              value={formData.house_no}
              onChangeText={v => setFormData(p => ({ ...p, house_no: v }))}
              placeholder="e.g. 12-3A"
            />
            {fieldErrors.house_no && <AppText style={styles.errorText}>{fieldErrors.house_no}</AppText>}
          </View>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Street / Locality <AppText style={styles.requiredStar}>*</AppText></AppText>
            <TextInput
              style={[styles.input, fieldErrors.street_locality && styles.inputError]}
              value={formData.street_locality}
              onChangeText={v => setFormData(p => ({ ...p, street_locality: v }))}
              placeholder="Street or locality"
            />
            {fieldErrors.street_locality && <AppText style={styles.errorText}>{fieldErrors.street_locality}</AppText>}
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Village/Town/City <AppText style={styles.requiredStar}>*</AppText></AppText>
            <TextInput
              style={[styles.input, fieldErrors.village_town_city && styles.inputError]}
              value={formData.village_town_city}
              onChangeText={v => setFormData(p => ({ ...p, village_town_city: v }))}
              placeholder="City name"
            />
            {fieldErrors.village_town_city && <AppText style={styles.errorText}>{fieldErrors.village_town_city}</AppText>}
          </View>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Mandal / Taluk <AppText style={styles.requiredStar}>*</AppText></AppText>
            <TextInput
              style={[styles.input, fieldErrors.mandal_taluk && styles.inputError]}
              value={formData.mandal_taluk}
              onChangeText={v => setFormData(p => ({ ...p, mandal_taluk: v }))}
              placeholder="Mandal or Taluk"
            />
            {fieldErrors.mandal_taluk && <AppText style={styles.errorText}>{fieldErrors.mandal_taluk}</AppText>}
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">District <AppText style={styles.requiredStar}>*</AppText></AppText>
            <TextInput
              style={[styles.input, fieldErrors.district && styles.inputError]}
              value={formData.district}
              onChangeText={v => setFormData(p => ({ ...p, district: v }))}
              placeholder="District name"
            />
            {fieldErrors.district && <AppText style={styles.errorText}>{fieldErrors.district}</AppText>}
          </View>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">State <AppText style={styles.requiredStar}>*</AppText></AppText>
            <TextInput
              style={[styles.input, fieldErrors.state && styles.inputError]}
              value={formData.state}
              onChangeText={v => setFormData(p => ({ ...p, state: v }))}
              placeholder="State name"
            />
            {fieldErrors.state && <AppText style={styles.errorText}>{fieldErrors.state}</AppText>}
          </View>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">PIN Code <AppText style={styles.requiredStar}>*</AppText></AppText>
            <TextInput
              style={[styles.input, fieldErrors.pin_code && styles.inputError]}
              value={formData.pin_code}
              onChangeText={v => setFormData(p => ({ ...p, pin_code: v }))}
              placeholder="6 digits"
              keyboardType="number-pad"
              maxLength={6}
            />
            {fieldErrors.pin_code && <AppText style={styles.errorText}>{fieldErrors.pin_code}</AppText>}
          </View>
        </View>

        <View style={styles.divider} />

        <AppText style={styles.stepTitle} weight="bold">Emergency & Medical</AppText>
        <View style={styles.row}>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Emergency Contact Name <AppText style={styles.requiredStar}>*</AppText></AppText>
            <TextInput
              style={[styles.input, fieldErrors.emergency_contact_name && styles.inputError]}
              value={formData.emergency_contact_name}
              onChangeText={v => setFormData(p => ({ ...p, emergency_contact_name: v }))}
              placeholder="Contact person"
            />
            {fieldErrors.emergency_contact_name && <AppText style={styles.errorText}>{fieldErrors.emergency_contact_name}</AppText>}
          </View>
          <View style={[styles.formGroup, styles.flexOne]}>
            <AppText style={styles.label} weight="semibold">Emergency Phone <AppText style={styles.requiredStar}>*</AppText></AppText>
            <TextInput
              style={[styles.input, fieldErrors.emergency_contact_number && styles.inputError]}
              value={formData.emergency_contact_number}
              onChangeText={v => setFormData(p => ({ ...p, emergency_contact_number: v }))}
              placeholder="10 digit number"
              keyboardType="phone-pad"
              maxLength={10}
            />
            {fieldErrors.emergency_contact_number && <AppText style={styles.errorText}>{fieldErrors.emergency_contact_number}</AppText>}
          </View>
        </View>
      </View>
    )}

    {step === 4 && (
      <View style={styles.photoUploadContainer}>
        <AppText style={styles.stepTitle} weight="bold">
          Student Photograph
          <AppText style={styles.requiredStar}> *</AppText>
        </AppText>
        <AppText style={styles.stepSubtitle}>Please upload a clear, front-facing passport size photograph of the student.</AppText>

        <View style={styles.photoFrame}>
          {selectedPhoto ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedPhoto.uri }} style={styles.photoPreview} />
              <TouchableOpacity accessibilityRole="button" style={styles.removePhotoBtn} onPress={() => setSelectedPhoto(null)}>
                <X size={20} color={Theme.colors.card} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Camera size={48} color={C.t4} />
              <AppText style={styles.placeholderText}>No photo selected</AppText>
            </View>
          )}
        </View>

        {fieldErrors.photo && <AppText style={[styles.errorText, { textAlign: 'center' }]}>{fieldErrors.photo}</AppText>}

        <View style={styles.photoActions}>
          <TouchableOpacity accessibilityRole="button" style={styles.photoActionBtn} onPress={() => handlePickImage('camera')}>
            <Camera size={20} color={C.primary} />
            <AppText style={styles.photoActionText} weight="semibold">Take Photo</AppText>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.photoActionBtn} onPress={() => handlePickImage('library')}>
            <Users size={20} color={C.primary} />
            <AppText style={styles.photoActionText} weight="semibold">Choose Gallery</AppText>
          </TouchableOpacity>
        </View>
      </View>
    )}

    {step === 5 && (
      <View style={styles.reviewContainer}>
        <AppText style={styles.stepTitle} weight="bold">Review & Submit</AppText>
        <AppText style={styles.stepSubtitle}>Double check all details before finalizing the enrollment.</AppText>

        <View style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            {selectedPhoto ? (
              <Image source={{ uri: selectedPhoto.uri }} style={styles.reviewAvatar} />
            ) : (
              <View style={[styles.reviewAvatar, { backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }]}>
                <User size={32} color={C.primary} />
              </View>
            )}
            <View>
              <AppText style={styles.reviewName} weight="bold">{formData.first_name} {formData.last_name}</AppText>
              <AppText style={styles.reviewSub}>Class {formData.class_grade} - {formData.section?.toUpperCase()}</AppText>
            </View>
          </View>

          <View style={styles.reviewGrid}>
            <View style={styles.reviewItem}>
              <AppText style={styles.reviewLabel}>Admission No</AppText>
              <AppText style={styles.reviewValue} weight="semibold">{formData.admission_number}</AppText>
            </View>
            <View style={styles.reviewItem}>
              <AppText style={styles.reviewLabel}>Roll No</AppText>
              <AppText style={styles.reviewValue} weight="semibold">{formData.roll_number}</AppText>
            </View>
            <View style={styles.reviewItem}>
              <AppText style={styles.reviewLabel}>Aadhaar</AppText>
              <AppText style={styles.reviewValue} weight="semibold">{formData.aadhaar_number || '—'}</AppText>
            </View>
            <View style={styles.reviewItem}>
              <AppText style={styles.reviewLabel}>DOB</AppText>
              <AppText style={styles.reviewValue} weight="semibold">{formData.date_of_birth}</AppText>
            </View>
            <View style={styles.reviewItem}>
              <AppText style={styles.reviewLabel}>Father's Name</AppText>
              <AppText style={styles.reviewValue} weight="semibold">{formData.father_guardian_name || '—'}</AppText>
            </View>
            <View style={styles.reviewItem}>
              <AppText style={styles.reviewLabel}>Emergency Phone</AppText>
              <AppText style={styles.reviewValue} weight="semibold">{formData.emergency_contact_number}</AppText>
            </View>
          </View>

          <View style={styles.reviewAddress}>
            <AppText style={styles.reviewLabel}>Residential Address</AppText>
            <AppText style={styles.reviewValue} weight="semibold">
              {[formData.house_no, formData.village_town_city, formData.district, formData.state, formData.pin_code].filter(Boolean).join(', ')}
            </AppText>
          </View>
        </View>

        {serverError ? (
          <View style={styles.serverErrorBox}>
            <AlertTriangle size={16} color={C.danger} />
            <AppText style={styles.serverErrorText}>{serverError}</AppText>
          </View>
        ) : null}

        {serverSuccess ? (
          <View style={styles.serverSuccessBox}>
            <CheckCircle2 size={16} color={C.success} />
            <AppText style={styles.serverSuccessText}>{serverSuccess}</AppText>
          </View>
        ) : null}
      </View>
    )}

    <View style={styles.stepActions}>
      {step > 0 && (
        <TouchableOpacity accessibilityRole="button" style={styles.stepBackBtn} onPress={prevStep} disabled={loading}>
          <AppText style={styles.stepBackText} weight="semibold">Back</AppText>
        </TouchableOpacity>
      )}
      <TouchableOpacity accessibilityRole="button"
        style={[styles.stepNextBtn, step === STEPS.length - 1 && styles.stepSubmitBtn]}
        onPress={step === STEPS.length - 1 ? handleSubmit : nextStep}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={Theme.colors.card} />
        ) : (
          <>
            <AppText style={styles.stepNextText} weight="bold">
              {step === STEPS.length - 1 ? 'Complete Registration' : 'Continue'}
            </AppText>
            {step < STEPS.length - 1 && <ChevronRight size={18} color={Theme.colors.card} />}
          </>
        )}
      </TouchableOpacity>
    </View>
  </View>

  {showDatePicker && (
    <DateTimePicker
      value={dateType === 'dob' ? (formData.date_of_birth ? new Date(formData.date_of_birth) : new Date(new Date().getFullYear() - 5, 0, 1)) : new Date()}
      mode="date"
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      onChange={handleDateChange}
      maximumDate={new Date()}
    />
  )}
</View>
  );
}
