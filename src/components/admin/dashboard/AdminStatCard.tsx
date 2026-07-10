import React from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { dashboardStyles as styles } from './dashboardStyles';

interface AdminStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  loading?: boolean;
}

export default function AdminStatCard({ title, value, icon: Icon, color, loading }: AdminStatCardProps) {
  const bgAccent = color + '15';
  return (
    <View style={styles.statCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.sm }}>
        <View style={{ width: 32, height: 32, borderRadius: Theme.radius.md, backgroundColor: bgAccent, justifyContent: 'center', alignItems: 'center' }}>
          <Icon size={16} color={color} />
        </View>
        <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: color }} />
      </View>
      {loading ? (
        <View style={styles.skeletonValue} />
      ) : (
        <AppText style={styles.statValue}>{value}</AppText>
      )}
      <AppText style={styles.statTitle}>{title}</AppText>
    </View>
  );
}
