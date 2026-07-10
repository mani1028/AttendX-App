// Types
export interface Student {
  student_id: string;
  student_full_name: string;
  roll_number: string;
  class_grade: string;
  section: string;
  gender: string;
  student_status: 'ACTIVE' | 'INACTIVE';
  student_photograph?: string;
  date_of_birth?: string;
  blood_group?: string;
  father_guardian_name?: string;
  father_guardian_mobile?: string;
  mother_guardian_name?: string;
  mother_guardian_mobile?: string;
  admission_number?: string;
}

export interface AssignedClass {
  class_grade: string;
  section: string;
}
