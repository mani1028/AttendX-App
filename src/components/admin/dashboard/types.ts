export interface AdminSchool {
  id: string;
  school_id: string;
  name: string;
  email: string;
  address: string;
  status: 'active' | 'inactive';
  current_plan_name?: string;
  subscription_status?: string;
  trial_end_at?: string;
  subscription_end_at?: string;
  last_payment_amount?: number;
  last_payment_at?: string;
  enable_manual_attendance?: boolean;
  enable_photo_attendance?: boolean;
  enable_video_attendance?: boolean;
  aadhaar_verification_required?: boolean;
  reports?: 'basic' | 'advanced';
  save_attendance_media?: boolean;
  enable_storage_timeline?: boolean;
  media_retention_timeline?: 'daily' | 'weekly' | 'monthly';
  custom_max_branches?: number | null;
  attendance_frequency?: number;
  director_name?: string;
}

export interface AdminStats {
  total_schools: number;
  active_paid: number;
  trial_active: number;
  payment_due: number;
  inactive: number;
  revenue_this_month: number;
}

export interface AdminSubscription {
  current_plan_name: string;
  subscription_status: string;
  access_enabled: boolean;
  trial_end_at?: string;
  subscription_end_at?: string;
  last_payment_amount?: number;
  last_payment_at?: string;
}

export interface AdminPayment {
  id: string;
  amount: number;
  plan_name: string;
  payment_method: string;
  status: string;
  paid_at: string;
  razorpay_payment_id?: string;
}

export interface AgentPermissions {
  can_register_school: boolean;
  can_view_payments: boolean;
  can_edit_features: boolean;
}
