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
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, Theme } from '../../../theme/tokens';
import { coerceAttendanceStatus } from '../../../utils/helpers';
import type { Student } from './types';

export const PALETTE = [
  { color: Theme.colors.blue, bg: 'rgba(59, 130, 246, 0.08)' },
  { color: Theme.colors.success, bg: 'rgba(16, 185, 129, 0.08)' },
  { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)' },
  { color: Theme.colors.warning, bg: 'rgba(245, 158, 11, 0.08)' },
];

export const resolveStudentId = (student: Student): string => {
  const candidates = [
    student.student_id,
    student.studentId,
    student.id,
    student.code,
    student.roll_number,
    student.admission_number,
  ];
  for (const value of candidates) {
    const text = String(value ?? '').trim();
    if (text && text !== '—') { return text; }
  }
  return '';
};

export const readLS = async (...keys: string[]): Promise<string> => {
  for (const key of keys) {
    const value = await AsyncStorage.getItem(key);
    if (value !== null && String(value).trim() !== '') { return String(value).trim(); }
  }
  return '';
};

export const avColor = (i: number) => PALETTE[i % PALETTE.length];

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

export const getStatusBadge = (status: string) => {
  switch (coerceAttendanceStatus(status)) {
    case 'PRESENT':
      return { bg: colors.successSoft, color: colors.success, icon: CheckCircle2 };
    case 'ABSENT':
      return { bg: colors.errorSoft, color: colors.error, icon: XCircle };
    case 'HALF_DAY':
      return { bg: colors.warningSoft, color: colors.warning, icon: Clock };
    default:
      return { bg: colors.warningSoft, color: colors.warning, icon: Clock };
  }
};
