export interface Visitor {
  id: string;
  visitor_no: string;
  full_name: string;
  phone: string;
  student_name: string;
  class_name: string;
  class_grade: string;
  purpose: string;
  status: 'pending' | 'checked_in' | 'checked_out' | 'rejected';
  visited_at: string;
}

export interface Stats {
  total_visitors: number;
  today_visitors: number;
  currently_present: number;
  pending_approval: number;
}

export interface QRData {
  token: string;
  url: string;
  qrImage?: string;
  branch_id?: string;
}
