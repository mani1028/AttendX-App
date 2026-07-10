import React, { useMemo } from 'react';
import type { NavigationProp } from '@react-navigation/native';
import {
  TrendingUp,
  BookOpen,
  Inbox,
  CreditCard,
  Users,
  DollarSign,
  FileText,
} from 'lucide-react-native';
import AppText from '../../common/AppText';
import AdminQuickActionGrid from '../AdminQuickActionGrid';
import { Theme } from '../../../theme/tokens';
import type { RootStackParamList } from '../../../navigation/types';
import { dashboardStyles as styles } from './dashboardStyles';

interface AdminQuickActionsSectionProps {
  navigation: NavigationProp<RootStackParamList>;
}

export default function AdminQuickActionsSection({ navigation }: AdminQuickActionsSectionProps) {
  const quickActions = useMemo(() => [
    {
      key: 'revenue',
      label: 'Revenue',
      icon: <TrendingUp size={20} color={Theme.colors.success} />,
      iconBg: 'rgba(34, 197, 94, 0.08)',
      onPress: () => (navigation as any).navigate('AdminRevenue'),
    },
    {
      key: 'blogs',
      label: 'Blogs',
      icon: <BookOpen size={20} color={Theme.colors.violet} />,
      iconBg: 'rgba(124, 58, 237, 0.08)',
      onPress: () => (navigation as any).navigate('AdminBlogManager'),
    },
    {
      key: 'forms',
      label: 'Website Forms',
      icon: <Inbox size={20} color={Theme.colors.blue} />,
      iconBg: 'rgba(37, 99, 235, 0.08)',
      onPress: () => (navigation as any).navigate('AdminFormLeads'),
    },
    {
      key: 'autopay',
      label: 'Auto Pay',
      icon: <CreditCard size={20} color="#06b6d4" />,
      iconBg: 'rgba(6, 182, 212, 0.08)',
      onPress: () => (navigation as any).navigate('AutoPayTracker'),
    },
    {
      key: 'manual',
      label: 'Manual Attendance',
      icon: <Users size={20} color="#f97316" />,
      iconBg: 'rgba(249, 115, 22, 0.08)',
      onPress: () => (navigation as any).navigate('ManualAttendanceManager'),
    },
    {
      key: 'plans',
      label: 'Plans',
      icon: <DollarSign size={20} color="#ec4899" />,
      iconBg: 'rgba(236, 72, 153, 0.08)',
      onPress: () => (navigation as any).navigate('MainTabs', { screen: 'Plans' }),
    },
    {
      key: 'payments',
      label: 'Payments',
      icon: <FileText size={20} color={Theme.colors.warning} />,
      iconBg: 'rgba(217, 119, 6, 0.08)',
      onPress: () => (navigation as any).navigate('PaymentHistory'),
    },
  ], [navigation]);

  return (
    <>
      <AppText style={styles.sectionTitle}>Quick Actions</AppText>
      <AdminQuickActionGrid actions={quickActions} />
    </>
  );
}
