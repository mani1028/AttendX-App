export interface TeacherPaper {
  paper_id: string;
  title: string;
  description?: string;
  exam_type: string;
  subject_id?: string | number;
  subject_name: string;
  class_id?: string | number;
  class_name: string;
  section_id?: string | number;
  section_name: string;
  created_at: string;
  file_size: number;
  status: string;
}

export interface UploadFormState {
  class_id: string;
  section_id: string;
  subject_id: string;
  title: string;
  description: string;
  exam_type: string;
}

export const INITIAL_FORM: UploadFormState = {
  class_id: '',
  section_id: '',
  subject_id: '',
  title: '',
  description: '',
  exam_type: '',
};

export interface SubjectFilter {
  key: string;
  label: string;
}
