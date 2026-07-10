export interface ClassItem {
  class_grade: string;
  section: string;
  label: string;
  students_total: number;
  present: number;
}

export interface Student {
  student_id: string;
  student_full_name: string;
  roll_number: string;
  admission_number: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY';
  email?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  address?: string;
  parent_name?: string;
  emergency_contact?: string;
  studentId?: string;
  id?: string;
  code?: string;
}

export interface SelectedClass {
  class_grade: string;
  section: string;
  label: string;
}

export interface FormData {
  branch_id: string;
  first_name: string;
  last_name: string;
  student_full_name: string;
  gender: string;
  date_of_birth: string;
  age: string;
  blood_group: string;
  nationality: string;
  mother_tongue: string;
  religion: string;
  caste_category: string;
  student_status: string;
  aadhaar_number: string;
  class_grade: string;
  section: string;
  admission_number: string;
  roll_number: string;
  academic_year: string;
  medium_of_instruction: string;
  date_of_admission: string;
  previous_school_name: string;
  transfer_certificate_number: string;
  identification_mark_1: string;
  identification_mark_2: string;
  father_guardian_name: string;
  father_guardian_mobile: string;
  father_guardian_occupation: string;
  mother_guardian_name: string;
  mother_guardian_mobile: string;
  mother_guardian_occupation: string;
  parent_guardian_email: string;
  house_no: string;
  street_locality: string;
  village_town_city: string;
  mandal_taluk: string;
  district: string;
  state: string;
  pin_code: string;
  allergies_details: string;
  medical_conditions: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  nearest_hospital_doctor: string;
  mode_of_transport: string;
  bus_route_vehicle_number: string;
  hostel_day_scholar: string;
  consent_digital_attendance: string;
  password: string;
  confirm_password: string;
}

export const STEPS = [
  'Personal Info',
  'Academic Details',
  'Guardian Info',
  'Contact Info',
  'Upload Photo',
  'Review & Submit',
] as const;

export const INITIAL_FORM: FormData = {
  branch_id: '',
  first_name: '',
  last_name: '',
  student_full_name: '',
  gender: '',
  date_of_birth: '',
  age: '',
  blood_group: '',
  nationality: 'Indian',
  mother_tongue: '',
  religion: '',
  caste_category: '',
  student_status: 'ACTIVE',
  aadhaar_number: '',
  class_grade: '',
  section: '',
  admission_number: '',
  roll_number: '',
  academic_year: '',
  medium_of_instruction: 'ENGLISH',
  date_of_admission: new Date().toISOString().split('T')[0],
  previous_school_name: '',
  transfer_certificate_number: '',
  identification_mark_1: '',
  identification_mark_2: '',
  father_guardian_name: '',
  father_guardian_mobile: '',
  father_guardian_occupation: '',
  mother_guardian_name: '',
  mother_guardian_mobile: '',
  mother_guardian_occupation: '',
  parent_guardian_email: '',
  house_no: '',
  street_locality: '',
  village_town_city: '',
  mandal_taluk: '',
  district: '',
  state: '',
  pin_code: '',
  allergies_details: '',
  medical_conditions: '',
  emergency_contact_name: '',
  emergency_contact_number: '',
  nearest_hospital_doctor: '',
  mode_of_transport: '',
  bus_route_vehicle_number: '',
  hostel_day_scholar: '',
  consent_digital_attendance: 'YES',
  password: '',
  confirm_password: '',
};

export interface SummaryStats {
  total: number;
  present: number;
  absent: number;
  visible: number;
}
