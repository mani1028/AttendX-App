import React from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import Loader from '../../common/Loader';
import { colors } from '../../../theme/tokens';
import { LeaveCard } from './BranchCards';
import { LEAVES_INITIAL_COUNT } from './helpers';
import { branchDetailsStyles as styles } from './branchDetailsStyles';
import type { LeaveRequest } from './types';

interface BranchLeavesTabProps {
  loading: boolean;
  leaveRequests: LeaveRequest[];
  showAllLeaves: boolean;
  onViewAll: () => void;
  onShowLess: () => void;
}

const BranchLeavesTab: React.FC<BranchLeavesTabProps> = ({
  loading,
  leaveRequests,
  showAllLeaves,
  onViewAll,
  onShowLess,
}) => {
  if (loading && leaveRequests.length === 0) {
    return <Loader />;
  }
  if (leaveRequests.length === 0) {
    return (
      <AppCard style={styles.emptyCard}>
        <AppText style={styles.emptyIcon}>📋</AppText>
        <AppText style={styles.emptyTitle}>No leave requests</AppText>
      </AppCard>
    );
  }
  return (
    <>
      {leaveRequests.map(leave => (
        <LeaveCard key={leave.leave_id} leave={leave} />
      ))}
      {loading && leaveRequests.length > 0 && (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
      )}
      {!showAllLeaves && leaveRequests.length >= LEAVES_INITIAL_COUNT && (
        <TouchableOpacity style={styles.viewAllLeavesBtn} onPress={onViewAll} disabled={loading}>
          <AppText style={styles.viewAllLeavesText}>
            {loading ? 'Fetching...' : 'View All Recent Requests →'}
          </AppText>
        </TouchableOpacity>
      )}
      {showAllLeaves && (
        <TouchableOpacity style={styles.viewAllLeavesBtn} onPress={onShowLess} disabled={loading}>
          <AppText style={styles.viewAllLeavesText}>
            {loading ? 'Fetching...' : 'Show Less'}
          </AppText>
        </TouchableOpacity>
      )}
    </>
  );
};

export default BranchLeavesTab;
