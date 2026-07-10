import { colors } from '../../../theme/tokens';

export const formatDate = (dateString: string): string => {
  if (!dateString) { return '—'; }
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getDaysLeft = (endDate: string | null): number | null => {
  if (!endDate) { return null; }
  const end = new Date(endDate);
  const today = new Date();
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const getDaysLeftColor = (days: number | null): string => {
  if (days === null) { return colors.textMuted; }
  if (days < 0) { return colors.error; }
  if (days <= 3) { return colors.warning; }
  return colors.success;
};

export const countExpiringSchools = (schools: { trial_end_at?: string; subscription_end_at?: string }[]): number =>
  schools.filter(s => {
    const days = getDaysLeft(s.trial_end_at || s.subscription_end_at || null);
    return days !== null && days <= 3 && days > 0;
  }).length;
