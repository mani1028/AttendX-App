export interface FormData {
  branch_id: string;
  teacher_full_name: string;
  gender: string;
  date_of_birth: string;
  age: string;
  blood_group: string;
  nationality: string;
  mother_tongue: string;
  religion: string;
  marital_status: string;
  aadhaar_number: string;
  mobile_number: string;
  alternate_mobile_number: string;
  email_id: string;
  house_no: string;
  street_locality: string;
  village_town_city: string;
  mandal_taluk: string;
  district: string;
  state: string;
  pin_code: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  emergency_contact_relationship: string;
  employee_id: string;
  designation: string;
  department_subject: string;
  qualification: string;
  experience_years: string;
  date_of_joining: string;
  employment_type: string;
  teacher_status: string;
  salary_amount: string;
  password: string;
  teacher_photograph: unknown;
}

export const STEPS = ['Basics', 'Contact', 'Emergency', 'Employment', 'Preview'] as const;

export type ToastType = 'success' | 'error';

export const INITIAL_FORM: FormData = {
  branch_id: '',
  teacher_full_name: '',
  gender: '',
  date_of_birth: '',
  age: '',
  blood_group: '',
  nationality: 'Indian',
  mother_tongue: '',
  religion: '',
  marital_status: '',
  aadhaar_number: '',
  mobile_number: '',
  alternate_mobile_number: '',
  email_id: '',
  house_no: '',
  street_locality: '',
  village_town_city: '',
  mandal_taluk: '',
  district: '',
  state: '',
  pin_code: '',
  emergency_contact_name: '',
  emergency_contact_number: '',
  emergency_contact_relationship: '',
  employee_id: '',
  designation: '',
  department_subject: '',
  qualification: '',
  experience_years: '',
  date_of_joining: '',
  employment_type: 'FULL_TIME',
  teacher_status: 'ACTIVE',
  salary_amount: '',
  password: '',
  teacher_photograph: null,
};
