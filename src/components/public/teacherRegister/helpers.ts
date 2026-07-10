import { isValidBloodGroup } from '../../../utils/studentRegistrationValidation';
import type { FormData } from './types';

export const safeTrim = (v: unknown): string => String(v ?? '').trim();

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

export const isValidAadhaar = (v: string): boolean => {
  const s = String(v || '').trim();
  if (!s) { return true; }
  return /^\d{12}$/.test(s);
};

export const isValidMobile = (v: string): boolean => /^\d{10}$/.test(String(v || '').trim());

export const isValidPin = (v: string): boolean => /^\d{6}$/.test(String(v || '').trim());

export const calculateAge = (dob: string): string => {
  if (!dob) { return ''; }
  const today = new Date();
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) { return ''; }
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) { age--; }
  return age >= 0 ? String(age) : '';
};

export interface ValidateTeacherStepOptions {
  hasPhoto: boolean;
  emailVerified: boolean;
}

export const validateTeacherRegistrationStep = (
  step: number,
  formData: FormData,
  { hasPhoto, emailVerified }: ValidateTeacherStepOptions,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (step === 0) {
    if (!safeTrim(formData.teacher_full_name)) { errors.teacher_full_name = 'Full name is required'; }
    if (!formData.gender) { errors.gender = 'Gender is required'; }
    if (!formData.date_of_birth) { errors.date_of_birth = 'Date of birth is required'; }
    if (!safeTrim(formData.nationality)) { errors.nationality = 'Nationality is required'; }
    if (!safeTrim(formData.mother_tongue)) { errors.mother_tongue = 'Mother tongue is required'; }
    if (!hasPhoto && !formData.teacher_photograph) { errors.teacher_photograph = 'Photo is required'; }
    if (!safeTrim(formData.email_id)) { errors.email_id = 'Email is required'; }
    else if (!isValidEmail(formData.email_id)) { errors.email_id = 'Enter a valid email'; }
    else if (!emailVerified) { errors.email_id = 'Please verify email with OTP before next step'; }
    if (formData.aadhaar_number && !isValidAadhaar(formData.aadhaar_number)) {
      errors.aadhaar_number = 'Aadhaar must be 12 digits';
    }
    if (formData.blood_group && !isValidBloodGroup(formData.blood_group)) {
      errors.blood_group = 'Select a valid blood group.';
    }
  }

  if (step === 1) {
    if (!safeTrim(formData.mobile_number)) { errors.mobile_number = 'Mobile is required'; }
    else if (!isValidMobile(formData.mobile_number)) { errors.mobile_number = 'Enter valid 10-digit number'; }
    if (!safeTrim(formData.house_no)) { errors.house_no = 'House No is required'; }
    if (!safeTrim(formData.street_locality)) { errors.street_locality = 'Street is required'; }
    if (!safeTrim(formData.village_town_city)) { errors.village_town_city = 'City is required'; }
    if (!safeTrim(formData.mandal_taluk)) { errors.mandal_taluk = 'Mandal/Taluk is required'; }
    if (!safeTrim(formData.district)) { errors.district = 'District is required'; }
    if (!safeTrim(formData.state)) { errors.state = 'State is required'; }
    if (!safeTrim(formData.pin_code)) { errors.pin_code = 'Pin code is required'; }
    else if (!isValidPin(formData.pin_code)) { errors.pin_code = 'Enter valid 6-digit pin code'; }
  }

  if (step === 2) {
    if (!safeTrim(formData.emergency_contact_name)) { errors.emergency_contact_name = 'Contact name is required'; }
    if (!safeTrim(formData.emergency_contact_number)) { errors.emergency_contact_number = 'Contact number is required'; }
    if (!safeTrim(formData.emergency_contact_relationship)) {
      errors.emergency_contact_relationship = 'Relationship is required';
    }
  }

  if (step === 3) {
    if (!safeTrim(formData.designation)) { errors.designation = 'Designation is required'; }
    if (!safeTrim(formData.department_subject)) { errors.department_subject = 'Department/Subject is required'; }
    if (!formData.date_of_joining) { errors.date_of_joining = 'Joining date is required'; }
    if (!formData.password || String(formData.password).length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
  }

  return errors;
};
