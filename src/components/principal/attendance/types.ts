export interface Teacher {
  teacher_id: string;
  teacher_full_name: string;
  employee_id: string;
  email_id: string;
  designation: string;
  department_subject: string;
  teacher_status: string;
  status: string;
}

export interface ClassItem {
  class_id: string;
  class_grade: string;
  section: string;
  students_total?: number;
  present?: number;
  label?: string;
}

export interface Student {
  student_id: string;
  student_full_name: string;
  roll_number: string;
  admission_number: string;
  status: string;
}

export interface AttendanceStatement {
  teachers: {
    attendance_pct: number;
    present_equivalent: number;
    half_day_equivalent: number;
  };
  students: {
    attendance_pct: number;
    present_equivalent: number;
    half_day_equivalent: number;
  };
  period: {
    start_date: string;
    end_date: string;
  };
}

export interface SectionGroup {
  class_grade: string;
  section: string;
  students_total?: number;
  present?: number;
}

export type AttendanceView = 'teachers' | 'students';
export type StmtScope = 'weekly' | 'monthly';
export type ExportType = 'teachers' | 'students';
