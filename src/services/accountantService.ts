import API from './api';

export type PaymentMethod = 'cash' | 'online';

export interface StudentDirectoryItem {
  id: string;
  student_id?: string;
  name?: string;
  student_full_name?: string;
  class_grade?: string;
  section?: string;
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
}

export interface PaymentRecord {
  id: string;
  fee_id: string;
  amount: number;
  method: PaymentMethod;
  paid_at?: string;
  created_at?: string;
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

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {};
}

function normalizeStatus(status: unknown): 'paid' | 'partial' | 'pending' {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'paid') return 'paid';
  if (normalized === 'partial' || normalized === 'partially_paid') return 'partial';
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
    id: toText(row.id ?? row.fee_id),
    student_id: toText(row.student_id),
    student_name: toText(row.student_name ?? row.name ?? row.student_full_name, ''),
    total_fee: total,
    paid_amount: paid,
    due_amount: due,
    status: normalizeStatus(row.status ?? row.payment_status),
    due_date: toText(row.due_date),
    created_at: toText(row.created_at, ''),
    academic_year: toText(row.academic_year, ''),
  };
}

function normalizePayment(item: unknown): PaymentRecord {
  const row = asRecord(item);
  const method = String(row.method ?? row.payment_method ?? '').toLowerCase() === 'online' ? 'online' : 'cash';

  return {
    id: toText(row.id ?? row.payment_id ?? row.txn_id),
    fee_id: toText(row.fee_id),
    amount: toNumber(row.amount),
    method,
    paid_at: toText(row.paid_at ?? row.date, ''),
    created_at: toText(row.created_at, ''),
  };
}

function pickList(data: unknown, keys: string[]): any[] {
  if (Array.isArray(data)) return data;
  const root = asRecord(data);
  for (const key of keys) {
    if (Array.isArray(root[key])) return root[key];
    const nested = asRecord(root[key]);
    if (Array.isArray(nested.items)) return nested.items;
  }
  if (Array.isArray(root.items)) return root.items;
  if (Array.isArray(asRecord(root.data).items)) return asRecord(root.data).items;
  return [];
}

export async function getSchoolStudents(): Promise<StudentDirectoryItem[]> {
  const response = await API.get<any>('manage/students');
  const rows = pickList(response.data, ['students', 'data']);
  return rows.map((row: any) => {
    const item = asRecord(row);
    return {
      id: toText(item.id ?? item.student_id),
      student_id: toText(item.student_id, ''),
      name: toText(item.name, ''),
      student_full_name: toText(item.student_full_name, ''),
      class_grade: toText(item.class_grade, ''),
      section: toText(item.section, ''),
    };
  });
}

export async function createFee(payload: CreateFeePayload): Promise<any> {
  const body = {
    ...payload,
    total_fee: Number(payload.total_fee),
  };
  const response = await API.post('accountant/fees/create', body);
  return response.data;
}

export async function updateFee(feeId: string, totalFee: number): Promise<any> {
  const response = await API.put(`accountant/fees/${encodeURIComponent(feeId)}`, null, {
    params: { total_fee: Number(totalFee) },
  });
  return response.data;
}

export async function getAllFees(): Promise<FeeRecord[]> {
  const response = await API.get<any>('accountant/fees');
  const rows = pickList(response.data, ['fees', 'data']);
  return rows.map(normalizeFee);
}

export async function getFeesByStudent(studentId: string): Promise<FeeRecord[]> {
  const response = await API.get<any>(`accountant/fees/${encodeURIComponent(studentId)}`);
  const rows = pickList(response.data, ['fees', 'history', 'data']);
  return rows.map(normalizeFee);
}

export async function addPayment(payload: AddPaymentPayload): Promise<any> {
  const body = {
    ...payload,
    amount: Number(payload.amount),
    method: payload.method,
  };
  const response = await API.post('accountant/payments/add', body);
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

export async function sendFeeAlerts(): Promise<any> {
  const response = await API.post('accountant/notifications/send-fee-alerts');
  return response.data;
}
