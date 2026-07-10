import type { PaymentRecord } from '../../../services/accountantService';

export interface Student {
  id: string;
  name?: string;
  student_full_name?: string;
  class_grade?: string;
  section?: string;
  roll_number?: string;
}

export interface Fee {
  id: string;
  student_id: string;
  student_name?: string;
  total_fee: number;
  paid_amount: number;
  due_amount: number;
  status: 'paid' | 'partial' | 'pending';
  due_date: string;
  created_at?: string;
  roll_number?: string;
  roll_no?: string;
}

export interface FormData {
  student_id: string;
  total_fee: string;
  due_date: string;
}

export type FeeStatusFilter = 'all' | 'pending' | 'partial' | 'paid';

export type { PaymentRecord };
