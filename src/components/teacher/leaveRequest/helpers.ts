import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../../services/api';
import { getTeacherProfile } from '../../../services/teacherService';
import { storage } from '../../../storage/storage';
import { StorageKeys } from '../../../storage/StorageKeys';
import type { LeaveAllocationItem } from '../../../services/teacherService';

// ponytail: one resolver — login writes mixed AsyncStorage keys; profile API is fallback
export async function loadTeacherLeaveContext(): Promise<{
  schoolCode: string;
  branchId: string;
  employeeId: string;
}> {
  const entries = await AsyncStorage.multiGet([
    'school_code', 'schoolCode', 'branch_id', 'branchId',
    'teacher_id', 'teacherId', 'employee_id', 'employeeId',
  ]);
  const bag: Record<string, string> = {};
  entries.forEach(([key, val]) => { if (val) { bag[key] = val; } });

  let schoolCode =
    bag.school_code ||
    bag.schoolCode ||
    (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
    '';
  let branchId =
    bag.branch_id ||
    bag.branchId ||
    (await storage.getString(StorageKeys.BRANCH_ID)) ||
    '';
  let employeeId =
    bag.teacher_id ||
    bag.teacherId ||
    bag.employee_id ||
    bag.employeeId ||
    (await storage.getString(StorageKeys.EMPLOYEE_ID)) ||
    '';

  if (!employeeId || !schoolCode) {
    try {
      const profile = await getTeacherProfile();
      if (!employeeId) {
        employeeId = String(profile?.teacher_id || profile?.employee_id || '').trim();
      }
      if (!schoolCode) {
        schoolCode = String(profile?.school_code || '').trim();
      }
      if (!branchId) {
        branchId = String(profile?.branch_id || '').trim();
      }
    } catch {
      // keep stored values
    }
  }

  if (schoolCode && employeeId) {
    try {
      const res = await API.get('/staff/marks/staff-context', {
        params: {
          school_code: schoolCode,
          branch_id: branchId,
          teacher_id: employeeId,
          employee_id: employeeId,
        },
      });
      const canonical = String(
        res.data?.teacher_data?.teacher_id ||
        res.data?.teacher_data?.employee_id ||
        employeeId,
      ).trim();
      if (canonical) { employeeId = canonical; }
    } catch {
      // use employeeId as-is
    }
  }

  return { schoolCode, branchId, employeeId };
}

export const LEAVE_CATEGORY_OPTIONS: { key: LeaveAllocationItem['type']; label: string }[] = [
  { key: 'CASUAL', label: 'Casual' },
  { key: 'SICK', label: 'Sick' },
  { key: 'PAID', label: 'Paid' },
  { key: 'COMP_OFF', label: 'Comp Off' },
  { key: 'LOP', label: 'LOP (Unpaid)' },
];

export const isValidYear = (dateString: string): boolean => {
  if (!dateString) { return true; }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) { return false; }
  const year = date.getFullYear();
  return year >= 1000 && year <= new Date().getFullYear() + 1;
};

export const formatDateToYMD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
