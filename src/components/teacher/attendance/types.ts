export interface TeacherData {
  employee_id: string;
  teacher_full_name: string;
  branch_id: string;
  enable_video_attendance?: boolean | string;
  is_class_teacher?: boolean;
  teacher_type?: string;
}

export interface AssignedClass {
  class_grade: string;
  section: string;
}

export interface Student {
  student_id: string;
  name: string;
  roll: string;
  admission_number?: string;
}

export interface StudentWithStatus extends Student {
  _defaultStatus: 'PRESENT' | 'ABSENT';
  _currentStatus?: 'PRESENT' | 'ABSENT';
  _changed?: boolean;
  mark_id?: string | null;
  hasExistingMarks?: boolean;
}

export interface AttendanceResult {
  summary: {
    total_students: number;
    present_count: number;
    absent_count: number;
    duplicate_count: number;
    images_processed: number;
    total_faces_detected: number;
    unknown_faces_count: number;
  };
  present: Student[];
  absent: Student[];
  duplicates: Student[];
  per_image_results?: any[];
  per_frame_results?: any[];
  date?: string;
}

export interface AttendanceForm {
  employee_id: string;
  branch_id: string;
  class_grade: string;
  section: string;
  attendance_date: string;
  attendance_session: string;
}

export interface ClassOption {
  key: string;
  class_grade: string;
  section: string;
  label: string;
}

export type ManualFilter = 'review' | 'all' | 'present' | 'absent' | 'changed';

export interface ManualCounts {
  all: number;
  present: number;
  absent: number;
  changed: number;
  review: number;
}
