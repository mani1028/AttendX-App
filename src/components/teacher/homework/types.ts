export interface Assignment {
  class_name: string;
  section_name: string;
  subject_name: string;
  class_grade?: string;
  section?: string;
  class_id?: number;
  section_id?: number;
  subject_id?: number;
}

export interface HomeworkItem {
  homework_id: string;
  class_name: string;
  section_name: string;
  subject_name: string;
  title: string;
  description: string;
  assigned_date: string;
  due_date: string;
}

export interface ClassOption {
  class_name: string;
  sections: string[];
}

export interface HomeworkFormState {
  class_name: string;
  section_name: string;
  subject_name: string;
  title: string;
  description: string;
  assigned_date: string;
  due_date: string;
}

export const emptyHomeworkForm = (): HomeworkFormState => ({
  class_name: '',
  section_name: '',
  subject_name: '',
  title: '',
  description: '',
  assigned_date: new Date().toISOString().split('T')[0],
  due_date: '',
});
