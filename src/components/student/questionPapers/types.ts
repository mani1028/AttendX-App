export interface Paper {
  paper_id: string;
  title: string;
  exam_type: string;
  teacher_name?: string;
  created_at?: string;
  class_name?: string;
  section_name?: string;
  file_size?: number;
  file_type?: string;
}

export interface Subject {
  subject_id: string;
  subject_name: string;
  subject_code?: string;
  papers: Paper[];
}

export interface FilterOptions {
  subject: string;
  examType: string;
}

export interface SubjectOption {
  id: string;
  name: string;
}
