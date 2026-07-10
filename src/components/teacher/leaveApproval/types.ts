export interface LeaveRequest {
  leave_id: string;
  student_full_name: string;
  roll_number: string;
  class_grade: string;
  section: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface ClassItem {
  id: string;
  name: string;
  class_grade: string;
}

export interface SectionItem {
  id: string;
  name: string;
  section: string;
}
