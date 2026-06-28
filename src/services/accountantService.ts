import API from './api';
import Storage from '@react-native-async-storage/async-storage';

export type PaymentMethod = 'cash' | 'online';

export interface StudentDirectoryItem {
  id: string;
  student_id?: string;
  name?: string;
  student_full_name?: string;
  class_grade?: string;
  section?: string;
  roll_number?: string;
}

export interface FeeRecord {
  id: string;
  student_id: string;
  student_name?: string;
  total_fee: number;
  paid_amount: number;
  due_amount: number;
  status: 'paid' | 'partial' | 'pending';
  due_date: string;
  created_at?: string;
  academic_year?: string;
  roll_number?: string;
}

export interface PaymentRecord {
  id: string;
  fee_id: string;
  amount: number;
  method: PaymentMethod;
  paid_at?: string;
  created_at?: string;
  receipt_no?: string;
  transaction_id?: string;
  student_name?: string;
  roll_no?: string;
  fee_type?: string;
  payment_date?: string;
}

export interface ExpenseRecord {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  created_at?: string;
  created_by?: string;
}

interface CreateFeePayload {
  student_id: string;
  total_fee: number;
  due_date: string;
  academic_year?: string;
}

interface AddPaymentPayload {
  fee_id: string;
  amount: number;
  method: PaymentMethod;
}

export interface DashboardSummary {
  total_fees_collected: number;
  total_pending_fees: number;
  total_expenses: number;
  net_balance: number;
}

function pickRecord(data: unknown, keys: string[]): Record<string, any> {
  const root = asRecord(data);

  if (keys.length === 0) {
    return root;
  }

  for (const key of keys) {
    const nested = root[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as Record<string, any>;
    }
  }

  return root;
}

function normalizeDashboardSummary(data: unknown): DashboardSummary {
  const payload = pickRecord(data, ['summary', 'dashboard', 'data', 'stats', 'result']);

  return {
    total_fees_collected: toNumber(
      payload.total_fees_collected ?? payload.fees_collected ?? payload.totalFeesCollected ?? payload.collected,
    ),
    total_pending_fees: toNumber(
      payload.total_pending_fees ?? payload.pending_fees ?? payload.totalPendingFees ?? payload.pending,
    ),
    total_expenses: toNumber(
      payload.total_expenses ?? payload.expenses ?? payload.totalExpenses,
    ),
    net_balance: toNumber(
      payload.net_balance ?? payload.balance ?? payload.netBalance,
    ),
  };
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {return value;}
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {return value;}
  if (typeof value === 'number') {return String(value);}
  return fallback;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {};
}

function normalizeStatus(status: unknown): 'paid' | 'partial' | 'pending' {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'paid') {return 'paid';}
  if (normalized === 'partial' || normalized === 'partially_paid') {return 'partial';}
  return 'pending';
}

function normalizeFee(item: unknown): FeeRecord {
  const row = asRecord(item);
  const total = toNumber(row.total_fee ?? row.total_amount ?? row.amount);
  const paid = toNumber(row.paid_amount ?? row.paid_fee ?? row.paid);
  const due = toNumber(
    row.due_amount ?? row.pending_fee ?? row.pending_amount ?? row.balance,
    Math.max(total - paid, 0),
  );

  return {
    id: toText(row.id ?? row.fee_id ?? row._id),
    student_id: toText(row.student_id),
    student_name: toText(row.student_name ?? row.name ?? row.student_full_name, ''),
    total_fee: total,
    paid_amount: paid,
    due_amount: due,
    status: normalizeStatus(row.status ?? row.payment_status),
    due_date: toText(row.due_date),
    created_at: toText(row.created_at, ''),
    academic_year: toText(row.academic_year, ''),
    roll_number: toText(row.roll_number ?? row.roll_no ?? row.rollNo ?? row.student_roll_number ?? row.student_roll_no, ''),
  };
}

function normalizePayment(item: unknown): PaymentRecord {
  const row = asRecord(item);
  const method = String(row.method ?? row.payment_method ?? '').toLowerCase() === 'online' ? 'online' : 'cash';

  return {
    id: toText(row.id ?? row.payment_id ?? row.txn_id ?? row._id),
    fee_id: toText(row.fee_id),
    amount: toNumber(row.amount),
    method,
    paid_at: toText(row.paid_at ?? row.date, ''),
    created_at: toText(row.created_at, ''),
    receipt_no: toText(row.receipt_no ?? row.receipt_number, ''),
    transaction_id: toText(row.transaction_id ?? row.txn_id ?? row.reference_id, ''),
    student_name: toText(row.student_name ?? row.studentName ?? row.name, ''),
    roll_no: toText(row.roll_no ?? row.roll_number ?? row.rollNumber, ''),
    fee_type: toText(row.fee_type ?? row.feeType ?? row.fee_category, ''),
    payment_date: toText(row.payment_date ?? row.paid_at ?? row.date ?? row.created_at, ''),
  };
}

function pickList(data: unknown, keys: string[]): any[] {
  if (Array.isArray(data)) {return data;}
  const root = asRecord(data);
  for (const key of keys) {
    if (Array.isArray(root[key])) {return root[key];}
    const nested = asRecord(root[key]);
    if (Array.isArray(nested.items)) {return nested.items;}
  }
  if (Array.isArray(root.items)) {return root.items;}
  if (Array.isArray(asRecord(root.data).items)) {return asRecord(root.data).items;}
  return [];
}

export async function getSchoolStudents(schoolCode?: string): Promise<StudentDirectoryItem[]> {
  const branchId = await Storage.getItem('branch_id') || await Storage.getItem('branchId') || '';
  const params: any = {};
  if (schoolCode) {params.school_code = schoolCode;}
  if (branchId) {params.branch_id = branchId;}

  const response = await API.get<any>('manage/students', { params });
  const rows = pickList(response.data, ['students', 'data']);
  return rows.map((row: any) => {
    const item = asRecord(row);
    return {
      id: toText(item.id ?? item.student_id ?? item._id),
      student_id: toText(item.student_id, ''),
      name: toText(item.name, ''),
      student_full_name: toText(item.student_full_name, ''),
      class_grade: toText(item.class_grade, ''),
      section: toText(item.section, ''),
      roll_number: toText(item.roll_number ?? item.roll_no ?? item.rollNo ?? item.student_roll_number ?? item.student_roll_no, ''),
    };
  });
}

export async function createFee(payload: CreateFeePayload, schoolCode?: string): Promise<any> {
  const body = {
    ...payload,
    total_fee: Number(payload.total_fee),
  };
  const response = await API.post('accountant/fees/create', body, {
    params: schoolCode ? { school_code: schoolCode } : undefined,
  });
  return response.data;
}

export async function updateFee(feeId: string, totalFee: number): Promise<any> {
  const response = await API.put(`accountant/fees/${encodeURIComponent(feeId)}`, null, {
    params: { total_fee: Number(totalFee) },
  });
  return response.data;
}

export async function getAllFees(schoolCode?: string): Promise<FeeRecord[]> {
  const response = await API.get<any>('accountant/fees', {
    params: schoolCode ? { school_code: schoolCode } : undefined,
  });
  const rows = pickList(response.data, ['fees', 'data']);
  return rows.map(normalizeFee);
}

export async function getDashboardSummary(schoolCode?: string): Promise<DashboardSummary> {
  const response = await API.get<any>('accountant/dashboard', {
    params: schoolCode ? { school_code: schoolCode } : undefined,
  });
  return normalizeDashboardSummary(response.data);
}

export async function getFeesByStudent(studentId: string, schoolCode?: string): Promise<FeeRecord[]> {
  const response = await API.get<any>(`accountant/fees/student/${encodeURIComponent(studentId)}`, {
    params: schoolCode ? { school_code: schoolCode } : undefined,
  });
  const rows = pickList(response.data, ['fees', 'history', 'data']);
  return rows.map(normalizeFee);
}

export async function addPayment(payload: AddPaymentPayload, schoolCode?: string): Promise<any> {
  const body = {
    ...payload,
    amount: Number(payload.amount),
    method: payload.method,
  };
  const response = await API.post('accountant/payments/add', body, {
    params: schoolCode ? { school_code: schoolCode } : undefined,
  });
  return response.data;
}

export async function getPaymentHistoryByFee(feeId: string): Promise<PaymentRecord[]> {
  const response = await API.get<any>(`accountant/payments/${encodeURIComponent(feeId)}`);
  const rows = pickList(response.data, ['payments', 'ledger', 'data']);
  return rows.map(normalizePayment);
}

export async function getPendingStudentsReport(): Promise<any[]> {
  const response = await API.get<any>('accountant/reports/pending-students');
  return pickList(response.data, ['students', 'data']);
}

export async function getMonthlyCollectionsReport(schoolCode?: string): Promise<Array<{ month: string; total: number }>> {
  const response = await API.get<any>('accountant/reports/monthly-collections', {
    params: schoolCode ? { school_code: schoolCode } : undefined,
  });
  const rows = pickList(response.data, ['collections', 'data']);
  return rows.map((row: any) => ({
    month: String(row.month || row.period || ''),
    total: toNumber(row.total ?? row.amount ?? 0),
  }));
}

export async function getAllPaymentHistory(schoolCode?: string): Promise<PaymentRecord[]> {
  const response = await API.get<any>('accountant/payments/history', {
    params: schoolCode ? { school_code: schoolCode } : undefined,
  });
  const rows = pickList(response.data, ['payments', 'history', 'data']);
  return rows.map(normalizePayment);
}

export async function sendFeeAlerts(): Promise<any> {
  const response = await API.post('accountant/notifications/send-fee-alerts');
  return response.data;
}

export async function downloadReceipt(paymentId: string): Promise<ArrayBuffer> {
  const encodedPaymentId = encodeURIComponent(paymentId);
  const endpoints = [
    `accountant/receipts/${encodedPaymentId}/download`,
    `accountant/payments/receipt/${encodedPaymentId}`,
  ];

  let lastError: any;
  for (const endpoint of endpoints) {
    try {
      const response = await API.get<ArrayBuffer>(endpoint, {
        responseType: 'arraybuffer',
      });
      return response.data;
    } catch (error: any) {
      lastError = error;
      const status = error?.response?.status;
      if (status !== 404 && status !== 405) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Could not download receipt from any known endpoint.');
}

// ============ EXPENSE MANAGEMENT ============

export async function getAllExpenses(): Promise<ExpenseRecord[]> {
  const response = await API.get<any>('accountant/expenses');
  const rows = pickList(response.data, ['expenses', 'data']);
  return rows.map((row: any) => {
    const item = asRecord(row);
    return {
      id: toText(item.id),
      title: toText(item.title, ''),
      amount: toNumber(item.amount),
      category: toText(item.category, ''),
      date: toText(item.date, ''),
      description: toText(item.description, ''),
      created_at: toText(item.created_at, ''),
      created_by: toText(item.created_by, ''),
    };
  });
}

export async function addExpense(payload: {
  title: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
}, schoolCode?: string): Promise<any> {
  const body = {
    ...payload,
    amount: Number(payload.amount),
  };
  const response = await API.post('accountant/expenses/add', body, {
    params: schoolCode ? { school_code: schoolCode } : undefined,
  });
  return response.data;
}

export async function updateExpense(expenseId: string, payload: Partial<{
  title: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
}>): Promise<any> {
  const body = {
    ...payload,
    amount: payload.amount ? Number(payload.amount) : undefined,
  };
  const response = await API.put(`accountant/expenses/${encodeURIComponent(expenseId)}`, body);
  return response.data;
}

export async function deleteExpense(expenseId: string): Promise<any> {
  const response = await API.delete(`accountant/expenses/${encodeURIComponent(expenseId)}`);
  return response.data;
}

export interface AccountantProfileData {
  name: string;
  email: string;
  phone: string;
  employeeId: string;
  role: string;
  schoolCode: string;
  branchId: string;
  branchName: string;
  designation: string;
  department: string;
  userId: string;
  joinedAt: string;
}

function firstNonEmptyText(...values: unknown[]): string {
  for (const value of values) {
    const text = toText(value, '').trim();
    if (text) {
      return text;
    }
  }
  return '';
}

export async function getAccountantProfile(
  fallback?: Partial<AccountantProfileData>,
): Promise<AccountantProfileData> {
  const [
    storedEmail,
    storedPhone,
    storedName,
    storedBranchName,
    storedBranchId,
    storedSchoolCode,
    storedEmployeeId,
    storedUserId,
    storedDesignation,
    storedJoinedAt,
    storedRole,
    storedUserRaw,
  ] = await Promise.all([
    Storage.getItem('email'),
    Storage.getItem('phone'),
    Storage.getItem('user_name'),
    Storage.getItem('branch_name'),
    Storage.getItem('branch_id'),
    Storage.getItem('school_code'),
    Storage.getItem('employee_id'),
    Storage.getItem('user_id'),
    Storage.getItem('designation'),
    Storage.getItem('date_of_joining'),
    Storage.getItem('userRole'),
    Storage.getItem('user'),
  ]);

  let storedUser: Record<string, any> = {};
  try {
    storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : {};
  } catch {
    storedUser = {};
  }

  const schoolCode = firstNonEmptyText(storedSchoolCode, storedUser?.school_code, fallback?.schoolCode);
  const employeeId = firstNonEmptyText(
    storedEmployeeId,
    storedUser?.employee_id,
    storedUser?.employeeId,
    fallback?.employeeId,
  );

  let apiProfile: Record<string, any> = {};
  if (schoolCode && employeeId) {
    try {
      const response = await API.get('staff/profile', {
        params: {
          employee_id: employeeId,
          school_code: schoolCode,
        },
      });
      apiProfile = asRecord(response.data);
    } catch (error) {
      console.warn('[accountantService] getAccountantProfile API failed:', error);
    }
  }

  const role = firstNonEmptyText(storedRole, storedUser?.role, fallback?.role, 'accountant');
  const accountantDesignation =
    String(role).toLowerCase() === 'accountant' ? 'Accountant' : firstNonEmptyText(
      apiProfile.designation,
      storedDesignation,
      storedUser?.designation,
      fallback?.designation,
      'Accountant',
    );

  return {
    name: firstNonEmptyText(
      apiProfile.staff_full_name,
      apiProfile.name,
      apiProfile.teacher_name,
      storedName,
      storedUser?.name,
      storedUser?.full_name,
      fallback?.name,
      'Accountant',
    ),
    email: firstNonEmptyText(
      apiProfile.email,
      apiProfile.email_id,
      storedEmail,
      storedUser?.email,
      storedUser?.email_id,
      fallback?.email,
    ),
    phone: firstNonEmptyText(
      apiProfile.phone,
      apiProfile.mobile_number,
      storedPhone,
      storedUser?.phone,
      storedUser?.mobile,
      storedUser?.mobile_number,
      fallback?.phone,
    ),
    employeeId: firstNonEmptyText(apiProfile.employee_id, employeeId, fallback?.employeeId),
    role,
    schoolCode: firstNonEmptyText(apiProfile.school_code, schoolCode, fallback?.schoolCode),
    branchId: firstNonEmptyText(apiProfile.branch_id, storedBranchId, storedUser?.branch_id, fallback?.branchId),
    branchName: firstNonEmptyText(
      apiProfile.branch_name,
      storedBranchName,
      storedUser?.branch_name,
      fallback?.branchName,
    ),
    designation: accountantDesignation,
    department: firstNonEmptyText(
      apiProfile.department_subject,
      apiProfile.department,
      storedUser?.department,
      storedUser?.department_subject,
      fallback?.department,
      'Accounts',
    ),
    userId: firstNonEmptyText(
      storedUserId,
      storedUser?.user_id,
      storedUser?.id,
      apiProfile.user_id,
      employeeId,
      fallback?.userId,
    ),
    joinedAt: firstNonEmptyText(
      apiProfile.date_of_joining,
      apiProfile.joined_at,
      storedJoinedAt,
      storedUser?.date_of_joining,
      fallback?.joinedAt,
    ),
  };
}
