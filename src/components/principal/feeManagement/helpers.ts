import { Theme, C } from '../../../theme/tokens';
import type { Student } from './types';

export const formatAmount = (amount: number) => `₹${amount.toFixed(2)}`;

export const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const getStatusStyle = (status: string) => {
  switch (status) {
    case 'paid':
      return { backgroundColor: C.successSoft, color: C.success };
    case 'partial':
      return { backgroundColor: C.warningSoft, color: C.warning };
    default:
      return { backgroundColor: C.errorSoft, color: C.error };
  }
};

export const getStatusText = (status: string) => {
  switch (status) {
    case 'paid':
      return 'PAID';
    case 'partial':
      return 'PARTIAL';
    default:
      return 'PENDING';
  }
};

export const getStudentName = (student: Student) =>
  student.name || student.student_full_name || 'N/A';

export const getStudentClass = (student: Student) => {
  if (student.class_grade && student.section) {
    return `${student.class_grade} - ${student.section}`;
  }
  return student.class_grade || student.section || '';
};

export const filterFees = (
  fees: import('./types').Fee[],
  search: string,
  statusFilter: import('./types').FeeStatusFilter,
) => {
  const q = search.trim().toLowerCase();
  return fees.filter(fee => {
    const matchesSearch = !q
      || (fee.student_name || '').toLowerCase().includes(q)
      || (fee.roll_number || '').toLowerCase().includes(q)
      || (fee.roll_no || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || fee.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
};

export const receiptLabel = (payment: import('./types').PaymentRecord) =>
  payment.receipt_no || `REC-${payment.id.substring(0, 8).toUpperCase()}`;

export const txnLabel = (payment: import('./types').PaymentRecord) =>
  payment.transaction_id || `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

export const formatPaymentDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
