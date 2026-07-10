import React from 'react';
import {
  Calendar,
  User,
  Mail,
  Phone,
  Briefcase,
  Award,
  MapPin,
  Shield,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Teacher, TeacherFormData } from './types';

export const readLS = async (keys: string[]): Promise<string> => {
  for (const key of keys) {
    const value = await AsyncStorage.getItem(key);
    if (value !== null && String(value).trim() !== '') { return String(value).trim(); }
  }
  return '';
};

export const getSchoolCode = async () => readLS(['school_code', 'schoolCode', 'school_id', 'schoolId']);
export const getBranchId = async () => readLS(['branch_id', 'branchId', 'branch_code', 'branchCode']);

export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
export const isValidName = (v: string) => {
  const s = String(v || '').trim();
  if (!s) { return false; }
  return /^[a-zA-Z\s'-]+$/.test(s) && !/^\d+$/.test(s);
};
export const isValidAadhaar = (v: string) => {
  const s = String(v || '').trim();
  if (!s) { return true; }
  return /^\d{12}$/.test(s);
};
export const isValidMobile = (v: string) => /^\d{10}$/.test(String(v || '').trim());
export const isValidPinCode = (v: string) => /^\d{6}$/.test(String(v || '').trim());

export const calculateAge = (dob: string) => {
  if (!dob) { return ''; }
  const today = new Date();
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) { return ''; }
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) { age--; }
  return age >= 0 ? String(age) : '';
};

export function validateStep(step: number, form: TeacherFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (step === 0) {
    if (!form.teacher_full_name.trim()) { errors.teacher_full_name = 'Full name is required'; }
    else if (!isValidName(form.teacher_full_name)) { errors.teacher_full_name = 'Full name must contain only letters'; }
    if (!form.gender) { errors.gender = 'Gender is required'; }
    if (!form.date_of_birth) { errors.date_of_birth = 'Date of birth is required'; }
    if (!form.nationality.trim()) { errors.nationality = 'Nationality is required'; }
    else if (!isValidName(form.nationality)) { errors.nationality = 'Nationality must contain only letters'; }
    if (!form.mother_tongue.trim()) { errors.mother_tongue = 'Mother tongue is required'; }
    else if (!isValidName(form.mother_tongue)) { errors.mother_tongue = 'Mother tongue must contain only letters'; }
    if (!form.email_id.trim()) { errors.email_id = 'Email is required'; }
    else if (!isValidEmail(form.email_id)) { errors.email_id = 'Enter a valid email'; }
    if (!form.aadhaar_number.trim()) { errors.aadhaar_number = 'Aadhaar number is required'; }
    else if (!isValidAadhaar(form.aadhaar_number)) { errors.aadhaar_number = 'Aadhaar must be 12 digits'; }
  }

  if (step === 1) {
    if (!form.mobile_number.trim()) { errors.mobile_number = 'Mobile is required'; }
    else if (!isValidMobile(form.mobile_number)) { errors.mobile_number = 'Enter valid 10-digit number'; }
    if (!form.house_no.trim()) { errors.house_no = 'House No is required'; }
    if (!form.street_locality.trim()) { errors.street_locality = 'Street is required'; }
    if (!form.village_town_city.trim()) { errors.village_town_city = 'City is required'; }
    if (!form.mandal_taluk.trim()) { errors.mandal_taluk = 'Mandal/Taluk is required'; }
    if (!form.district.trim()) { errors.district = 'District is required'; }
    if (!form.state.trim()) { errors.state = 'State is required'; }
    if (!form.pin_code.trim()) { errors.pin_code = 'Pin code is required'; }
    else if (!isValidPinCode(form.pin_code)) { errors.pin_code = 'Enter valid 6-digit pin code'; }
  }

  if (step === 2) {
    if (!form.emergency_contact_name.trim()) { errors.emergency_contact_name = 'Contact name is required'; }
    if (!form.emergency_contact_number.trim()) { errors.emergency_contact_number = 'Contact number is required'; }
    else if (!isValidMobile(form.emergency_contact_number)) { errors.emergency_contact_number = 'Enter valid 10-digit number'; }
    if (!form.emergency_contact_relationship.trim()) { errors.emergency_contact_relationship = 'Relationship is required'; }
  }

  if (step === 3) {
    if (!form.designation.trim()) { errors.designation = 'Designation is required'; }
    if (!form.department_subject.trim()) { errors.department_subject = 'Department/Subject is required'; }
    if (!form.date_of_joining) { errors.date_of_joining = 'Joining date is required'; }
    if (!form.password || String(form.password).length < 6) { errors.password = 'Password must be at least 6 characters'; }
    if (!form.email_id.trim()) { errors.email_id = 'Email is required'; }
    else if (!isValidEmail(form.email_id)) { errors.email_id = 'Enter a valid email'; }
    if (!form.teacher_photograph) { errors.teacher_photograph = 'Photo is required'; }
  }

  return errors;
}

export const teacherToEditForm = (teacher: Teacher): Record<string, string> => ({
  teacher_full_name: teacher.teacher_full_name || '',
  gender: teacher.gender || '',
  date_of_birth: teacher.date_of_birth || '',
  age: teacher.age || '',
  blood_group: teacher.blood_group || '',
  nationality: teacher.nationality || '',
  mother_tongue: teacher.mother_tongue || '',
  religion: teacher.religion || '',
  marital_status: teacher.marital_status || '',
  aadhaar_number: teacher.aadhaar_number || '',
  mobile_number: teacher.mobile_number || '',
  alternate_mobile_number: teacher.alternate_mobile_number || '',
  email_id: teacher.email_id || '',
  house_no: teacher.house_no || '',
  street_locality: teacher.street_locality || '',
  village_town_city: teacher.village_town_city || '',
  mandal_taluk: teacher.mandal_taluk || '',
  district: teacher.district || '',
  state: teacher.state || '',
  pin_code: teacher.pin_code || '',
  emergency_contact_name: teacher.emergency_contact_name || '',
  emergency_contact_number: teacher.emergency_contact_number || '',
  emergency_contact_relationship: teacher.emergency_contact_relationship || '',
  employee_id: teacher.employee_id || '',
  designation: teacher.designation || '',
  department_subject: teacher.department_subject || '',
  qualification: teacher.qualification || '',
  experience_years: teacher.experience_years || '',
  date_of_joining: teacher.date_of_joining || '',
  employment_type: teacher.employment_type || '',
  teacher_status: teacher.teacher_status || 'ACTIVE',
  salary_amount: teacher.salary_amount || '',
});

export const sanitizeTeacherFieldChange = (name: string, value: string): string => {
  const nameFields = new Set([
    'teacher_full_name', 'nationality', 'mother_tongue', 'religion', 'marital_status',
    'emergency_contact_name', 'emergency_contact_relationship', 'designation', 'department_subject',
    'district', 'state', 'village_town_city', 'mandal_taluk',
  ]);
  if (nameFields.has(name)) { return value.replace(/[^a-zA-Z\s'-]/g, ''); }
  const numberFields = new Set([
    'mobile_number', 'alternate_mobile_number', 'emergency_contact_number',
    'pin_code', 'aadhaar_number', 'age', 'salary_amount', 'experience_years',
  ]);
  if (!numberFields.has(name)) { return value; }
  let next = value.replace(/\D/g, '');
  if (['mobile_number', 'alternate_mobile_number', 'emergency_contact_number'].includes(name)) {
    next = next.slice(0, 10);
  } else if (name === 'aadhaar_number') { next = next.slice(0, 12); }
  else if (name === 'pin_code') { next = next.slice(0, 6); }
  return next;
};

export const getValidationErrorStep = (allErrors: Record<string, string>): number => {
  if (allErrors.teacher_full_name || allErrors.gender || allErrors.date_of_birth ||
      allErrors.nationality || allErrors.mother_tongue || allErrors.email_id || allErrors.aadhaar_number) {
    return 0;
  }
  if (allErrors.mobile_number || allErrors.house_no || allErrors.street_locality ||
      allErrors.village_town_city || allErrors.mandal_taluk || allErrors.district ||
      allErrors.state || allErrors.pin_code) {
    return 1;
  }
  if (allErrors.emergency_contact_name || allErrors.emergency_contact_number ||
      allErrors.emergency_contact_relationship) {
    return 2;
  }
  return 3;
};

export const filterTeachers = (
  items: Teacher[],
  query: string,
  statusFilter: string,
  deptFilter: string,
): Teacher[] => {
  let list = [...items];
  const search = query.trim().toLowerCase();
  if (search) {
    list = list.filter((t) =>
      String(t.teacher_full_name || '').toLowerCase().includes(search) ||
      String(t.employee_id || '').toLowerCase().includes(search) ||
      String(t.email_id || '').toLowerCase().includes(search) ||
      String(t.mobile_number || '').toLowerCase().includes(search),
    );
  }
  if (statusFilter !== 'all') {
    list = list.filter((t) =>
      statusFilter === 'active'
        ? String(t.teacher_status || '').toUpperCase() === 'ACTIVE'
        : String(t.teacher_status || '').toUpperCase() === 'INACTIVE',
    );
  }
  if (deptFilter !== 'all') {
    list = list.filter((t) => String(t.department_subject || '') === deptFilter);
  }
  return list;
};

export const getIconForField = (label: string, primaryColor: string, size: number = 14) => {
  const lbl = label.toLowerCase();
  if (lbl.includes('id')) { return <Shield size={size} color={primaryColor} />; }
  if (lbl.includes('designation') || lbl.includes('type') || lbl.includes('experience') || lbl.includes('role')) { return <Briefcase size={size} color={primaryColor} />; }
  if (lbl.includes('department') || lbl.includes('qualification') || lbl.includes('subject') || lbl.includes('class')) { return <Award size={size} color={primaryColor} />; }
  if (lbl.includes('mobile') || lbl.includes('number') || lbl.includes('contact') || lbl.includes('phone') || lbl.includes('emergency')) { return <Phone size={size} color={primaryColor} />; }
  if (lbl.includes('email')) { return <Mail size={size} color={primaryColor} />; }
  if (lbl.includes('gender') || lbl.includes('age') || lbl.includes('marital') || lbl.includes('nationality') || lbl.includes('religion') || lbl.includes('tongue') || lbl.includes('aadhaar') || lbl.includes('parent') || lbl.includes('name')) { return <User size={size} color={primaryColor} />; }
  if (lbl.includes('birth') || lbl.includes('date') || lbl.includes('dob') || lbl.includes('joining')) { return <Calendar size={size} color={primaryColor} />; }
  if (lbl.includes('house') || lbl.includes('street') || lbl.includes('city') || lbl.includes('mandal') || lbl.includes('district') || lbl.includes('state') || lbl.includes('pin') || lbl.includes('address')) { return <MapPin size={size} color={primaryColor} />; }
  return null;
};
