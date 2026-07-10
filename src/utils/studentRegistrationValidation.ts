export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const safeTrim = (v: unknown): string => String(v ?? '').trim();

export const isValidEmail = (v: string): boolean => {
  const s = safeTrim(v);
  if (!s) { return true; }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
};

export const isValidMobile = (v: string): boolean => /^\d{10}$/.test(safeTrim(v));

export const isValidPin = (v: string): boolean => /^\d{6}$/.test(safeTrim(v));

export const isValidAadhaar = (v: string): boolean => {
  const s = safeTrim(v);
  if (!s) { return true; }
  return /^\d{12}$/.test(s);
};

export const isValidName = (v: string): boolean => {
  const s = safeTrim(v);
  if (!s) { return false; }
  return /^[a-zA-Z\s'-]+$/.test(s) && !/^\d+$/.test(s);
};

export const isValidBloodGroup = (v: string): boolean => {
  const s = safeTrim(v);
  if (!s) { return true; }
  return BLOOD_GROUPS.includes(s as BloodGroup);
};

export const isStrongPassword = (v: string): boolean => {
  const s = String(v || '');
  return s.length >= 8 && /[A-Z]/.test(s) && /[a-z]/.test(s) && /\d/.test(s) && /[^A-Za-z0-9]/.test(s);
};

export const getPasswordStrength = (v: string) => {
  const s = String(v || '');
  return {
    minLength: s.length >= 8,
    hasUpper: /[A-Z]/.test(s),
    hasLower: /[a-z]/.test(s),
    hasNumber: /\d/.test(s),
    hasSpecial: /[^A-Za-z0-9]/.test(s),
  };
};

export const calcAgeFromDOB = (dob: string): string => {
  if (!dob) { return ''; }
  const today = new Date();
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) { return ''; }
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) { age--; }
  return age >= 0 && age < 120 ? String(age) : '';
};

export const isValidDateOfBirth = (dobString: string): { valid: boolean; error: string | null } => {
  if (!dobString) { return { valid: true, error: null }; }

  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  const year = dob.getFullYear();
  if (year < 1000 || year > new Date().getFullYear()) {
    return {
      valid: false,
      error: `Invalid year ${year}. Please use a valid year (e.g., 1991, 2024)`,
    };
  }

  const today = new Date();
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  if (dob > oneYearAgo) {
    return { valid: false, error: 'Date of Birth must be more than 1 year old' };
  }

  return { valid: true, error: null };
};

export interface StudentRegistrationForm {
  first_name?: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  nationality?: string;
  blood_group?: string;
  aadhaar_number?: string;
  class_grade?: string;
  section?: string;
  admission_number?: string;
  roll_number?: string;
  academic_year?: string;
  father_guardian_name?: string;
  father_guardian_mobile?: string;
  mother_guardian_name?: string;
  mother_guardian_mobile?: string;
  parent_guardian_email?: string;
  house_no?: string;
  street_locality?: string;
  mandal_taluk?: string;
  district?: string;
  village_town_city?: string;
  state?: string;
  pin_code?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  password?: string;
  confirm_password?: string;
}

/** Mandatory fields per step — aligned with the web registration form. */
export const WEB_REGISTRATION_REQUIRED_BY_STEP: Record<number, readonly string[]> = {
  0: ['first_name', 'last_name', 'gender', 'date_of_birth', 'nationality'],
  1: ['class_grade', 'section', 'admission_number', 'academic_year'],
  2: ['father_guardian_name', 'father_guardian_mobile', 'mother_guardian_name', 'parent_guardian_email'],
  3: [
    'house_no',
    'street_locality',
    'village_town_city',
    'mandal_taluk',
    'district',
    'state',
    'pin_code',
    'emergency_contact_name',
    'emergency_contact_number',
  ],
  4: ['photo', 'password', 'confirm_password'],
};

export function isWebRegistrationFieldRequired(field: string, step: number): boolean {
  return WEB_REGISTRATION_REQUIRED_BY_STEP[step]?.includes(field) ?? false;
}

export interface StudentRegistrationValidationOptions {
  hasPhoto?: boolean;
  includePassword?: boolean;
  /** Set false when roll number is auto-assigned on submit (teacher/public flows). */
  requireRollNumber?: boolean;
}

/** Shared step validation aligned with the web student registration form. */
export function validateStudentRegistrationStep(
  step: number,
  form: StudentRegistrationForm,
  options: StudentRegistrationValidationOptions = {},
): Record<string, string> {
  const errors: Record<string, string> = {};
  const { hasPhoto = false, includePassword = false, requireRollNumber = true } = options;

  if (step === 0) {
    if (!isValidName(form.first_name || '')) { errors.first_name = 'Valid first name required.'; }
    if (!isValidName(form.last_name || '')) { errors.last_name = 'Valid last name required.'; }
    if (!form.gender) { errors.gender = 'Gender is required.'; }
    if (!form.date_of_birth) {
      errors.date_of_birth = 'Date of birth is required.';
    } else {
      const { valid, error } = isValidDateOfBirth(form.date_of_birth);
      if (!valid) { errors.date_of_birth = error || 'Invalid DOB.'; }
    }
    if (form.blood_group && !isValidBloodGroup(form.blood_group)) {
      errors.blood_group = 'Select a valid blood group.';
    }
    if (!isValidAadhaar(form.aadhaar_number || '')) {
      errors.aadhaar_number = 'Aadhaar must be 12 digits.';
    }
    if (!safeTrim(form.nationality)) {
      errors.nationality = 'Nationality is required.';
    }
  } else if (step === 1) {
    if (!form.class_grade) { errors.class_grade = 'Class is required.'; }
    if (!form.section) { errors.section = 'Section is required.'; }
    if (!form.admission_number) { errors.admission_number = 'Admission number is required.'; }
    if (requireRollNumber && !form.roll_number) { errors.roll_number = 'Roll number is required.'; }
    if (!form.academic_year) {
      errors.academic_year = 'Academic year is required.';
    } else if (!isValidAcademicYear(form.academic_year || '')) {
      errors.academic_year = 'Format: YYYY-YY (e.g. 2023-24).';
    }
  } else if (step === 2) {
    if (!isValidName(form.father_guardian_name || '')) {
      errors.father_guardian_name = 'Father/guardian name is required.';
    }
    if (!form.father_guardian_mobile) {
      errors.father_guardian_mobile = 'Father mobile is required.';
    } else if (!isValidMobile(form.father_guardian_mobile)) {
      errors.father_guardian_mobile = 'Invalid mobile.';
    }
    if (!isValidName(form.mother_guardian_name || '')) {
      errors.mother_guardian_name = 'Mother/guardian name is required.';
    }
    if (form.mother_guardian_mobile && !isValidMobile(form.mother_guardian_mobile)) {
      errors.mother_guardian_mobile = 'Invalid mobile.';
    }
    if (!safeTrim(form.parent_guardian_email)) {
      errors.parent_guardian_email = 'Parent email is required.';
    } else if (!isValidEmail(form.parent_guardian_email!)) {
      errors.parent_guardian_email = 'Invalid email.';
    }
  } else if (step === 3) {
    if (!safeTrim(form.house_no)) { errors.house_no = 'House number is required.'; }
    if (!safeTrim(form.street_locality)) { errors.street_locality = 'Street/locality is required.'; }
    if (!form.village_town_city) { errors.village_town_city = 'City/Village is required.'; }
    if (!safeTrim(form.mandal_taluk)) { errors.mandal_taluk = 'Mandal/Taluk is required.'; }
    if (!safeTrim(form.district)) { errors.district = 'District is required.'; }
    if (!form.state) { errors.state = 'State is required.'; }
    if (!safeTrim(form.pin_code)) {
      errors.pin_code = 'PIN code is required.';
    } else if (!isValidPin(form.pin_code!)) {
      errors.pin_code = 'Invalid PIN code.';
    }
    if (!safeTrim(form.emergency_contact_name)) {
      errors.emergency_contact_name = 'Emergency contact name is required.';
    }
    if (!form.emergency_contact_number) {
      errors.emergency_contact_number = 'Emergency contact is required.';
    } else if (!isValidMobile(form.emergency_contact_number)) {
      errors.emergency_contact_number = 'Invalid mobile.';
    }
  } else if (step === 4) {
    if (!hasPhoto) { errors.photo = 'Student photo is required.'; }
    if (includePassword) {
      if (!safeTrim(form.password)) {
        errors.password = 'Password is required';
      } else if (!isStrongPassword(form.password || '')) {
        errors.password = 'Password must contain uppercase, lowercase, number, and special character';
      }
      if (!safeTrim(form.confirm_password)) {
        errors.confirm_password = 'Please retype password';
      }
      if (form.password && form.confirm_password && form.password !== form.confirm_password) {
        errors.confirm_password = 'Passwords do not match';
      }
    }
  }

  return errors;
}

export const toClassPickerOptions = (classes: Array<{ class_name: string }>) =>
  classes
    .filter((cls) => Boolean(cls?.class_name))
    .map((cls) => ({
      label: `Class ${cls.class_name}`,
      value: cls.class_name,
    }));

export const toSectionPickerOptions = (sections: string[]) =>
  sections
    .filter(Boolean)
    .map((section) => ({
      label: `Section ${String(section).toUpperCase()}`,
      value: String(section),
    }));

export const bloodGroupPickerOptions = () =>
  BLOOD_GROUPS.map((group) => ({ label: group, value: group }));

export const GENDER_OPTIONS = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Other', value: 'OTHER' },
] as const;

export const MEDIUM_OF_INSTRUCTION_OPTIONS = [
  { label: 'English', value: 'ENGLISH' },
  { label: 'Telugu', value: 'TELUGU' },
  { label: 'Hindi', value: 'HINDI' },
  { label: 'Urdu', value: 'URDU' },
  { label: 'Tamil', value: 'TAMIL' },
  { label: 'Kannada', value: 'KANNADA' },
  { label: 'Malayalam', value: 'MALAYALAM' },
  { label: 'Other', value: 'OTHER' },
] as const;

export const MODE_OF_TRANSPORT_OPTIONS = [
  { label: 'School Bus', value: 'SCHOOL BUS' },
  { label: 'Private Vehicle', value: 'PRIVATE' },
  { label: 'Walking', value: 'WALKING' },
  { label: 'Bicycle', value: 'BICYCLE' },
  { label: 'Public Transport', value: 'PUBLIC TRANSPORT' },
  { label: 'Other', value: 'OTHER' },
] as const;

export const HOSTEL_DAY_SCHOLAR_OPTIONS = [
  { label: 'Day Scholar', value: 'DAY SCHOLAR' },
  { label: 'Hostel', value: 'HOSTEL' },
] as const;

/** Indian academic year label e.g. 2025-26 */
export const formatAcademicYear = (startYear: number): string =>
  `${startYear}-${String(startYear + 1).slice(-2)}`;

/** Default academic year based on April–March cycle. */
export const getDefaultAcademicYear = (): string => {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return formatAcademicYear(startYear);
};

export const getAcademicYearOptions = (yearsBack = 2, yearsForward = 2) => {
  const currentStart = Number(getDefaultAcademicYear().slice(0, 4));
  const options: { label: string; value: string }[] = [];
  for (let offset = yearsForward; offset >= -yearsBack; offset -= 1) {
    const value = formatAcademicYear(currentStart + offset);
    options.push({ label: value, value });
  }
  return options;
};

export const formatOptionLabel = (
  value: string,
  options: ReadonlyArray<{ label: string; value: string }>,
): string => options.find((option) => option.value === value)?.label || value || '—';

export const formatGenderLabel = (value: string): string =>
  formatOptionLabel(value, GENDER_OPTIONS);

export const normalizeGenderValue = (value: string): string => {
  const normalized = safeTrim(value).toUpperCase();
  if (normalized === 'MALE' || normalized === 'FEMALE' || normalized === 'OTHER') {
    return normalized;
  }
  const match = GENDER_OPTIONS.find(
    (option) => option.label.toUpperCase() === normalized || option.value === normalized,
  );
  return match?.value || normalized;
};

export const isValidAcademicYear = (value: string): boolean =>
  /^\d{4}-\d{2}$/.test(safeTrim(value));

/** Production AttendX API register-request endpoints (OpenAPI). */
export const STAFF_STUDENT_REGISTER_ENDPOINTS = [
  'student/register-request',
  'manage/student/register-request',
  'student/register',
  'manage/student/register',
  'staff/student/register-request',
  'manage/staff/student/register-request',
] as const;

export const PUBLIC_STUDENT_REGISTER_ENDPOINTS = [
  'student/register-request',
  'manage/student/register-request',
] as const;

const REGISTRATION_FORM_SKIP_KEYS = new Set([
  'branch_id',
  'confirm_password',
  'first_name',
  'last_name',
  'student_full_name',
  'age',
  'photo',
]);

/** Normalize a single registration field value before multipart submit. */
export function sanitizeRegistrationField(key: string, value: unknown): string {
  const v = safeTrim(value);
  if (!v) { return ''; }

  if (key === 'father_guardian_mobile' || key === 'mother_guardian_mobile' || key === 'emergency_contact_number') {
    return v.replace(/\D/g, '').slice(0, 10);
  }
  if (key === 'aadhaar_number') {
    return v.replace(/\D/g, '').slice(0, 12);
  }
  if (key === 'pin_code') {
    return v.replace(/\D/g, '').slice(0, 6);
  }
  if (key === 'section') {
    return v.toUpperCase().replace(/[^A-Z]/g, '');
  }
  if (key === 'academic_year') {
    const digits = v.replace(/[^0-9]/g, '');
    if (digits.length >= 6) {
      return `${digits.slice(0, 4)}-${digits.slice(4, 6)}`;
    }
  }
  if (key === 'date_of_birth' || key === 'date_of_admission') {
    const d = new Date(v);
    if (!isNaN(d.getTime())) { return d.toISOString().split('T')[0]; }
  }
  if (key === 'gender') {
    return normalizeGenderValue(v);
  }

  return v;
}

export interface BuildStudentRegistrationFormDataOptions {
  schoolCode: string;
  branchId: string;
  photoFile?: { uri?: string; type?: string; fileName?: string } | null;
  includeSchoolCode?: boolean;
}

/** Build multipart payload matching AttendX register-request OpenAPI schema. */
export function buildStudentRegistrationFormData(
  form: Record<string, unknown>,
  options: BuildStudentRegistrationFormDataOptions,
): FormData {
  const formData = new FormData();
  const { schoolCode, branchId, photoFile, includeSchoolCode = true } = options;

  if (includeSchoolCode && schoolCode) {
    formData.append('school_code', schoolCode);
  }
  formData.append('branch_id', branchId);

  if (photoFile?.uri) {
    const photo = photoFile as { uri?: string; type?: string; fileName?: string; name?: string };
    formData.append('student_photo', {
      uri: photo.uri,
      type: photo.type || 'image/jpeg',
      name: photo.fileName || photo.name || 'student_photo.jpg',
    } as any);
  }

  Object.entries(form).forEach(([key, value]) => {
    if (REGISTRATION_FORM_SKIP_KEYS.has(key)) { return; }
    const val = sanitizeRegistrationField(key, value);
    if (!val) { return; }
    formData.append(key, val);
  });

  const fullName = `${safeTrim(form.first_name)} ${safeTrim(form.last_name)}`.trim();
  if (fullName) {
    formData.append('student_full_name', fullName);
  }

  const gender = sanitizeRegistrationField('gender', form.gender);
  if (gender) {
    formData.append('gender', gender);
  }

  const password = safeTrim(form.password);
  if (password) {
    formData.append('password', password);
  }

  const parentEmail = safeTrim(form.parent_guardian_email);
  if (parentEmail) {
    formData.append('parent_email', parentEmail);
  }

  const admissionDate = sanitizeRegistrationField('date_of_admission', form.date_of_admission)
    || new Date().toISOString().split('T')[0];
  formData.append('date_of_admission', admissionDate);

  formData.append('consent_digital_attendance', safeTrim(form.consent_digital_attendance) || 'YES');
  formData.append('aadhaar_verified', 'false');

  return formData;
}
