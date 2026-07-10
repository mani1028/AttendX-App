export interface ClassItem {
  class_id: string;
  class_name: string;
}

export interface SectionItem {
  section_id: string;
  section_name: string;
}

export interface ExamItem {
  exam_id: string;
  exam_name: string;
  academic_year: string;
}

export interface SubjectItem {
  subject_id: string;
  subject_name: string;
  max_marks?: number;
}

export interface StudentMark {
  student_id: string;
  roll_no: string;
  student_full_name: string;
  roll_number: string;
  marks_obtained: string;
  isAbsent: boolean;
  grade?: string;
  status?: string;
  mark_id?: string | null;
  hasExistingMarks: boolean;
}

export interface Assignment {
  class_id: number;
  class_name: string;
  section_id: number;
  section_name: string;
  subject_id: number;
  subject_name: string;
}

export type FilterPickerMode = 'class' | 'section' | 'exam' | 'subject';
