import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { School, Users, GraduationCap, Layers } from 'lucide-react-native';
import { Theme } from '../../../theme/tokens';
import DirectorKpiCard from './DirectorKpiCard';
import { formatAttendanceBadge } from './helpers';
import type { DirectorStats } from './types';

export interface DirectorKpiSectionProps {
  selectedBranchId: string;
  displayedStats: DirectorStats;
  onKpiPress: () => void;
}

export default function DirectorKpiSection({
  selectedBranchId,
  displayedStats,
  onKpiPress,
}: DirectorKpiSectionProps) {
  return (
    <View style={styles.statsGrid}>
      <DirectorKpiCard
        title={selectedBranchId === 'ALL' ? 'Branches' : 'Branch'}
        value={displayedStats.branches}
        sub={`${displayedStats.activeBranches} active branch${displayedStats.activeBranches === 1 ? '' : 'es'}`}
        icon={School}
        iconBg="rgba(59, 130, 246, 0.12)"
        iconColor={Theme.colors.blue}
        badge={displayedStats.inactiveBranches > 0 ? `${displayedStats.inactiveBranches} Inactive` : 'All Active'}
        badgeUp={displayedStats.inactiveBranches === 0}
        cardStyle={styles.kpiCardHalf}
        onPress={onKpiPress}
      />
      <DirectorKpiCard
        title="Teachers"
        value={displayedStats.teachers}
        sub="Total school staff"
        icon={Users}
        iconBg="rgba(16, 185, 129, 0.12)"
        iconColor={Theme.colors.success}
        badge={
          displayedStats.teachers === 0
            ? 'No staff'
            : formatAttendanceBadge(
                displayedStats.teachers,
                displayedStats.teacherAttendanceToday,
                displayedStats.teacherPresentToday,
              )
        }
        badgeUp={displayedStats.teacherAttendanceToday >= 75}
        cardStyle={styles.kpiCardHalf}
        onPress={onKpiPress}
      />
      <DirectorKpiCard
        title="Students"
        value={displayedStats.students}
        sub="Enrolled students"
        icon={GraduationCap}
        iconBg="rgba(245, 158, 11, 0.12)"
        iconColor={Theme.colors.warning}
        badge={
          displayedStats.students === 0
            ? 'No students'
            : formatAttendanceBadge(
                displayedStats.students,
                displayedStats.studentAttendanceToday,
                displayedStats.studentPresentToday,
              )
        }
        badgeUp={displayedStats.studentAttendanceToday >= 75}
        cardStyle={styles.kpiCardHalf}
        onPress={onKpiPress}
      />
      <DirectorKpiCard
        title="Classes"
        value={displayedStats.classes}
        sub={`${displayedStats.sections} section${displayedStats.sections === 1 ? '' : 's'}`}
        icon={Layers}
        iconBg="rgba(124, 58, 237, 0.12)"
        iconColor={Theme.colors.violet}
        badge={displayedStats.pendingLeaves > 0 ? `${displayedStats.pendingLeaves} Leaves` : 'No Leaves'}
        badgeUp={displayedStats.pendingLeaves === 0}
        cardStyle={styles.kpiCardHalf}
        onPress={onKpiPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    columnGap: 12,
    marginBottom: Theme.spacing.xl,
    marginTop: -24,
    zIndex: 1,
    position: 'relative',
    ...Platform.select({ android: { elevation: 4 } }),
  },
  kpiCardHalf: {
    width: '48%',
  },
});
