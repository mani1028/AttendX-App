export interface TeacherLeave {
  leave_id: number;
  teacher_id: number;
  teacher_full_name: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  teacher_avatar?: string;
  subject?: string;
}

export type TeacherLeaveFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
