import { Theme } from '../../../theme/tokens';

export const formatDate = (dateString: string): string => {
  if (!dateString) { return '-'; }
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN');
};

export const getHealthMeta = (status: string) => {
  const key = String(status || '').toUpperCase();
  if (key === 'HEALTHY') { return { label: 'Healthy', bg: 'rgba(16, 185, 129, 0.1)', color: Theme.colors.success, border: 'rgba(16, 185, 129, 0.2)' }; }
  if (key === 'INACTIVE') { return { label: 'Inactive', bg: 'rgba(239, 68, 68, 0.1)', color: Theme.colors.error, border: 'rgba(239, 68, 68, 0.2)' }; }
  if (key === 'PRINCIPAL_MISSING') { return { label: 'Principal Missing', bg: 'rgba(245, 158, 11, 0.1)', color: Theme.colors.warning, border: 'rgba(245, 158, 11, 0.2)' }; }
  if (key === 'NO_CLASSES') { return { label: 'No Classes', bg: 'rgba(245, 158, 11, 0.1)', color: Theme.colors.warning, border: 'rgba(245, 158, 11, 0.2)' }; }
  if (key === 'NO_TEACHERS') { return { label: 'No Teachers', bg: 'rgba(245, 158, 11, 0.1)', color: Theme.colors.warning, border: 'rgba(245, 158, 11, 0.2)' }; }
  if (key === 'NO_STUDENTS') { return { label: 'No Students', bg: 'rgba(245, 158, 11, 0.1)', color: Theme.colors.warning, border: 'rgba(245, 158, 11, 0.2)' }; }
  return { label: 'Needs Review', bg: 'rgba(148, 163, 184, 0.1)', color: Theme.colors.textMuted, border: 'rgba(148, 163, 184, 0.2)' };
};

export const formatAttendanceBadge = (total: number, pct: number, present: number | null): string => {
  if (total === 0) { return 'No data'; }
  if (pct === 0 && present === null) { return 'Not marked'; }
  return `${pct}% Present`;
};

export const formatBillingDate = (value?: string) => {
  if (!value) { return '—'; }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) { return String(value).slice(0, 10); }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const getPaymentStatusLabel = (status?: string) => {
  const key = String(status || '').toLowerCase();
  if (key === 'paid' || key === 'success' || key === 'captured') { return 'Paid'; }
  if (key === 'failed' || key === 'cancelled') { return 'Failed'; }
  return 'Pending';
};
