export interface TeacherProfile {
  teacher_id: string;
  employee_id: string;
  branch_id: string;
  teacher_full_name: string;
  gender: string;
  date_of_birth: string;
  age: number;
  blood_group: string;
  nationality: string;
  email_id: string;
  mobile_number: string;
  aadhaar_number: string;
  address?: string;
  designation: string;
  department_subject: string;
  class_grade: string;
  section: string;
  date_of_joining: string;
  employment_type: string;
}

export interface TeacherCapability {
  name: string;
  branch_assignment: string;
  is_class_teacher: boolean;
}

export interface TeacherContextResponse {
  teacher_id: string;
  employee_id: string;
  teacher_full_name: string;
  department_subject: string;
  branch_id: string;
  class_grade: string;
  section: string;
  assigned_classes?: any[];
}
