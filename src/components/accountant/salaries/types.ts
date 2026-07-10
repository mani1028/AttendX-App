export interface Employee {
  id: string;
  employee_id: string;
  name: string;
  position: string;
  department?: string;
  salary: number;
  employment_type: string;
}

export interface SalaryHistory {
  id: string;
  old_salary: number;
  new_salary: number;
  effective_date: string;
  change_reason: string;
}

export interface SalariesManagementProps {
  schoolCode: string;
}
