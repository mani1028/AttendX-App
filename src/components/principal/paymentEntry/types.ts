export interface Fee {
  id: string;
  student_id: string;
  student_name: string;
  total_fee: number;
  paid_amount: number;
  due_amount: number;
  status: string;
  due_date: string;
}

export interface Payment {
  id: string;
  fee_id: string;
  amount: number;
  method: 'cash' | 'online';
  date: string;
  receipt_number?: string;
}

export interface FormData {
  fee_id: string;
  amount: string;
  method: 'cash' | 'online';
}
