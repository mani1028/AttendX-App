import type { DirectorDashboardStats } from '../../../services/directorService';

export interface DirectorBranch {
  branch_id: string;
  branch_name: string;
  branch_status: string;
  principal_employee_id: string;
  principal_name: string;
  principal_email: string;
  creation_date: string;
  teachers_count: number;
  students_count: number;
  classes_count: number;
  sections_count: number;
  teacher_attendance_today: number;
  student_attendance_today: number;
  pending_leave_requests: number;
  health_status: string;
}

export type DirectorStats = DirectorDashboardStats;

export type DirectorBranchEditData = Partial<DirectorBranch>;
