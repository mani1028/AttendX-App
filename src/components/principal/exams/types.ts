export interface Exam {
  exam_id: number;
  exam_name: string;
  academic_year: string;
  class_grade?: string;
  section?: string;
  subject_name?: string;
  subject_count: number;
  total_max_marks?: number;
  creation_date: string;
}

export interface SubjectMark {
  subject_name: string;
  max_marks: number;
  marks_obtained: number;
  percentage: number;
  grade: string;
}

export interface StudentMarks {
  student_id: number;
  student_name: string;
  roll_number: string;
  class_grade: string;
  section: string;
  subjects: SubjectMark[];
  total_marks: number;
  total_max_marks: number;
  overall_percentage: number;
  overall_grade: string;
}

export interface MarksReport {
  exam_name: string;
  academic_year: string;
  students: StudentMarks[];
}
