export interface Teacher {
  teacher_id: string;
  employee_id: string;
  teacher_full_name: string;
  department_subject: string;
  mobile_number: string;
  email_id: string;
  teacher_status: string;
}

export interface Student {
  student_id: string;
  roll_number: string;
  admission_number: string;
  student_full_name: string;
  class_grade: string;
  section: string;
  father_guardian_name: string;
}

export interface ClassSection {
  class_name: string;
  sections: string[];
}

export interface LeaveRequest {
  leave_id: string;
  student_name?: string;
  student_full_name?: string;
  teacher_full_name?: string;
  teacher_name?: string;
  name?: string;
  full_name?: string;
  roll_number?: string;
  roll_no?: string;
  class_grade?: string;
  class_name?: string;
  class?: string;
  section?: string;
  section_name?: string;
  employee_id?: string;
  teacher_id?: string;
  subject?: string;
  department_subject?: string;
  leave_type?: 'student' | 'teacher';
  from_date: string;
  to_date: string;
  reason: string;
  status: string;
  created_at?: string;
}

export interface Exam {
  exam_id: string;
  exam_name: string;
  academic_year: string;
}

export interface ExamMark {
  student_id: string;
  student_name: string;
  roll_number: string;
  admission_number: string;
  class_grade: string;
  section: string;
  subject_name: string;
  marks_obtained: number;
  grade: string;
  max_marks: number;
  pass_marks: number;
}

export interface StudentMarkSummary {
  student_id: string;
  student_name: string;
  roll_number: string;
  admission_number: string;
  class_grade: string;
  section: string;
  marks: Array<{
    subject_name: string;
    marks_obtained: number;
    grade: string;
    max_marks: number;
    pass_marks: number;
    is_passed: boolean;
  }>;
  total_marks: number;
  max_possible: number;
  subjects_count: number;
  failed_subjects: number;
  percentage: number;
  result: 'PASS' | 'FAIL';
}

export interface AttendanceRecord {
  roll_number?: string;
  student_full_name?: string;
  name?: string;
  status: string;
}

export interface TeacherAttendance {
  employee_id: string;
  teacher_full_name: string;
  status: string;
}

export interface StudentExamData {
  exams: Array<{
    exam_id: number;
    exam_name: string;
    subjects: Array<{
      subject_name: string;
      marks_obtained: number;
      max_marks: number;
    }>;
  }>;
  all_subjects: string[];
}

export type BranchTab = 'teachers' | 'students' | 'attendance' | 'leaves' | 'marks';

export interface FilterPickerState {
  visible: boolean;
  title: string;
  options: { label: string; value: string }[];
  selectedValue: string;
  onValueChange: (value: string) => void;
}
