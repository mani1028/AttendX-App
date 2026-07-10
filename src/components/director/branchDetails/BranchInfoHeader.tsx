import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import { StatCard } from './BranchCards';
import { StatusBadge } from './BranchBadges';
import { branchDetailsStyles as styles } from './branchDetailsStyles';
import type { ClassSection, LeaveRequest } from './types';

interface BranchInfoHeaderProps {
  branchId: string;
  branchStatus?: string;
  teachersCount: number;
  studentsCount: number;
  classSections: ClassSection[];
  leaveRequests: LeaveRequest[];
}

const BranchInfoHeader: React.FC<BranchInfoHeaderProps> = ({
  branchId,
  branchStatus,
  teachersCount,
  studentsCount,
  classSections,
  leaveRequests,
}) => (
  <>
    <View style={styles.branchSubHeader}>
      <AppText style={styles.subtitle}>Branch ID: {branchId}</AppText>
      <StatusBadge status={branchStatus || 'ACTIVE'} />
    </View>
    <View style={styles.statsGrid}>
      <StatCard title="Total Teachers" value={teachersCount} icon="👨‍🏫" />
      <StatCard title="Total Students" value={studentsCount} icon="👨‍🎓" />
      <StatCard title="Classes" value={classSections.length} icon="📚" />
      <StatCard title="Pending Leaves" value={leaveRequests.filter(l => l.status === 'PENDING').length} icon="⏳" />
    </View>
  </>
);

export default BranchInfoHeader;
