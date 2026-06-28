import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../services/api';

export interface AttendanceModeSettings {
  enable_manual_attendance: boolean;
  enable_video_attendance: boolean;
  enable_photo_attendance: boolean;
  daily_sessions: number;
  aadhaar_required: boolean;
  requiresSchoolSelection?: boolean;
  error: string | null;
}

const DEFAULTS: AttendanceModeSettings = {
  enable_manual_attendance: false,
  enable_video_attendance: true,
  enable_photo_attendance: false,
  daily_sessions: 1,
  aadhaar_required: false,
  error: null,
};

export async function fetchAttendanceMode(): Promise<AttendanceModeSettings> {
  const schoolCode =
    (await AsyncStorage.getItem('school_code')) ||
    (await AsyncStorage.getItem('schoolCode')) ||
    '';
  const branchId =
    (await AsyncStorage.getItem('branch_id')) ||
    (await AsyncStorage.getItem('branchId')) ||
    '';

  if (!schoolCode || !branchId) {
    return { ...DEFAULTS, error: 'Missing school/branch info' };
  }

  try {
    const response = await API.get('principal/attendance/settings', {
      headers: {
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
      },
    });
    const data = response.data || {};
    return {
      enable_manual_attendance: Boolean(data.enable_manual_attendance),
      enable_video_attendance: Boolean(data.enable_video_attendance),
      enable_photo_attendance: Boolean(data.enable_photo_attendance),
      daily_sessions: Number(data.daily_sessions) || 1,
      aadhaar_required: Boolean(data.aadhaar_required),
      requiresSchoolSelection: data.enable_manual_attendance === true,
      error: null,
    };
  } catch (error: any) {
    return {
      ...DEFAULTS,
      error: error?.message || 'Failed to fetch settings',
    };
  }
}

/** Resolve which attendance UI mode to show (matches web AttendanceModeWrapper) */
export function resolveAttendanceUiMode(settings: AttendanceModeSettings): 'video' | 'manual' {
  if (settings.enable_video_attendance || settings.enable_photo_attendance) {
    return 'video';
  }
  if (settings.enable_manual_attendance) {
    return 'manual';
  }
  return 'video';
}
