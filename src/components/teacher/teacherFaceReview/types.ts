export interface StudentItem {
  roll_no: string;
  name: string;
  has_photo: boolean;
  has_embedding: boolean;
  photo_url?: string | null;
}

export interface ClassOption {
  class_grade: string;
  section: string;
}

export interface ReviewData {
  items: StudentItem[];
  total: number;
  class_grade: string | null;
  section: string | null;
  teacher_name: string | null;
  teacher_employee_id: string | null;
  last_review: string | null;
  assigned_classes: ClassOption[];
  selected_all?: boolean;
}
