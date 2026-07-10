import React from 'react';
import { Bell, Calendar, Info, AlertTriangle, PartyPopper, Tent, BadgeCheck } from 'lucide-react-native';
import { Theme } from '../../../theme/tokens';

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: string;
  event_date: string | null;
  created_at: string;
  is_read?: boolean;
}


export const TYPE_CONFIG: Record<
  string,
  { icon: React.ReactNode; bg: string; color: string; label: string }
> = {
  event: {
    icon: <Calendar size={18} color={Theme.colors.blue} />,
    bg: Theme.colors.blueLight,
    color: Theme.colors.blue,
    label: 'EVENT',
  },
  program: {
    icon: <Tent size={18} color={Theme.colors.success} />,
    bg: Theme.colors.greenLight,
    color: Theme.colors.success,
    label: 'PROGRAM',
  },
  festival: {
    icon: <PartyPopper size={18} color={Theme.colors.warning} />,
    bg: Theme.colors.amberLight,
    color: Theme.colors.warning,
    label: 'FESTIVAL',
  },
  urgent: {
    icon: <AlertTriangle size={18} color={Theme.colors.error} />,
    bg: Theme.colors.redLight,
    color: Theme.colors.error,
    label: 'URGENT',
  },
  announcement: {
    icon: <Info size={18} color={Theme.colors.info} />,
    bg: Theme.colors.skyLight,
    color: Theme.colors.info,
    label: 'ANNOUNCEMENT',
  },
  approval: {
    icon: <BadgeCheck size={18} color={Theme.colors.success} />,
    bg: Theme.colors.greenLight,
    color: Theme.colors.success,
    label: 'APPROVAL',
  },
  approved: {
    icon: <BadgeCheck size={18} color={Theme.colors.success} />,
    bg: Theme.colors.greenLight,
    color: Theme.colors.success,
    label: 'APPROVED',
  },
  request: {
    icon: <BadgeCheck size={18} color={Theme.colors.success} />,
    bg: Theme.colors.greenLight,
    color: Theme.colors.success,
    label: 'REQUEST',
  },
  registration: {
    icon: <BadgeCheck size={18} color={Theme.colors.success} />,
    bg: Theme.colors.greenLight,
    color: Theme.colors.success,
    label: 'REGISTRATION',
  },
  student_registration: {
    icon: <BadgeCheck size={18} color={Theme.colors.success} />,
    bg: Theme.colors.greenLight,
    color: Theme.colors.success,
    label: 'STUDENT REG.',
  },
  fee_due: {
    icon: <Bell size={18} color={Theme.colors.violet} />,
    bg: Theme.colors.violetLight,
    color: Theme.colors.violet,
    label: 'FEE DUE',
  },
  fee: {
    icon: <Bell size={18} color={Theme.colors.violet} />,
    bg: Theme.colors.violetLight,
    color: Theme.colors.violet,
    label: 'FEE',
  },
};

export const getTypeConfig = (type: string) => {
  return (
    TYPE_CONFIG[type?.toLowerCase()] || {
      icon: <Bell size={18} color={Theme.colors.primary} />,
      bg: Theme.colors.violetLight,
      color: Theme.colors.primary,
      label: (type || 'GENERAL').toUpperCase(),
    }
  );
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {return 'Just now';}
  if (diffMins < 60) {return `${diffMins}m ago`;}
  if (diffHours < 24) {return `${diffHours}h ago`;}
  if (diffDays < 7) {return `${diffDays}d ago`;}
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatFullDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

export const normalizeNotification = (item: any): Notification => ({
  id: String(item.id ?? item.notification_id ?? ''),
  title: String(item.title ?? item.subject ?? item.heading ?? 'Notification').trim(),
  description: String(
    item.description ?? item.message ?? item.body ?? item.content ?? '',
  ).trim(),
  type: String(item.type ?? item.notification_type ?? 'event'),
  event_date: item.event_date ?? null,
  created_at: item.created_at ?? new Date().toISOString(),
  is_read: Boolean(item.is_read),
});
