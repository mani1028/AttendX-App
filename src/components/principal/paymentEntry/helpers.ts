import { Theme, C } from '../../../theme/tokens';
import type { Fee, Payment } from './types';

export const formatAmount = (amount: number) => `₹${amount.toFixed(2)}`;

export const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getDueStatusColor = (dueAmount: number) => {
  if (dueAmount === 0) return Theme.colors.success;
  if (dueAmount < 0) return Theme.colors.error;
  return Theme.colors.warning;
};
