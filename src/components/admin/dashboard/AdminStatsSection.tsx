import React from 'react';
import { View } from 'react-native';
import { Home, CheckCircle, Clock, AlertCircle } from 'lucide-react-native';
import { colors } from '../../../theme/tokens';
import AdminStatCard from './AdminStatCard';
import { dashboardStyles as styles } from './dashboardStyles';
import type { AdminStats, AgentPermissions } from './types';

interface AdminStatsSectionProps {
  stats: AdminStats | null;
  isAgent: boolean;
  agentPermissions: AgentPermissions;
}

export default function AdminStatsSection({ stats, isAgent, agentPermissions }: AdminStatsSectionProps) {
  const showPayments = !isAgent || agentPermissions.can_view_payments;

  return (
    <View style={styles.statsGrid}>
      <AdminStatCard title="Schools" value={stats?.total_schools || 0} icon={Home} color={colors.primary} loading={!stats} />
      {showPayments && (
        <AdminStatCard title="Paid" value={stats?.active_paid || 0} icon={CheckCircle} color={colors.success} loading={!stats} />
      )}
      <AdminStatCard title="Trial" value={stats?.trial_active || 0} icon={Clock} color={colors.secondary} loading={!stats} />
      {showPayments && (
        <AdminStatCard title="Due" value={stats?.payment_due || 0} icon={AlertCircle} color={colors.warning} loading={!stats} />
      )}
    </View>
  );
}
