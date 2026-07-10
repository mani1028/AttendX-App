import { C } from '../../theme/tokens';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FileText } from 'lucide-react-native';
import API from '../../services/api';
import { formatErrorMessage } from '../../utils/helpers';
import AppText from '../../components/common/AppText';
import { safeGoBack } from '../../utils/navigationHelpers';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import {
  teacherLeaveStyles as styles,
  TeacherLeaveCard,
  TeacherLeaveFilterTabs,
  TeacherLeaveDetailModal,
  type TeacherLeave,
  type TeacherLeaveFilter,
} from '../../components/principal/teacherLeave';

export default function TeacherLeaveScreen({ navigation }: any) {
  const [leaves, setLeaves] = useState<TeacherLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<TeacherLeaveFilter>('PENDING');
  const [selectedLeave, setSelectedLeave] = useState<TeacherLeave | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

  const loadLeaves = useCallback(async (showLoader = true) => {
    if (showLoader) { setLoading(true); }
    try {
      const schoolCode = (await AsyncStorage.getItem('school_code')) || (await AsyncStorage.getItem('schoolCode')) || '';
      const response = await API.post('/manage/principal/staff-leave-requests', { school_code: schoolCode });
      const data = response.data?.items || response.data || [];
      setLeaves(Array.isArray(data) ? data : []);
      setStats({
        pending: data.filter((l: any) => l.status === 'PENDING').length,
        approved: data.filter((l: any) => l.status === 'APPROVED').length,
        rejected: data.filter((l: any) => l.status === 'REJECTED').length,
      });
    } catch (error: any) {
      console.error('Error loading leaves:', error);
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail || 'Failed to load leave requests'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadLeaves(); }, [loadLeaves]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaves(false);
  };

  const handleStatusUpdate = async (leaveId: number, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(true);
    try {
      const schoolCode = (await AsyncStorage.getItem('school_code')) || (await AsyncStorage.getItem('schoolCode')) || '';
      await API.put('/manage/principal/staff-leave-requests/action', {
        school_code: schoolCode,
        leave_id: leaveId,
        action: status,
      });
      Alert.alert('Success', `Leave request ${status.toLowerCase()} successfully`);
      setSelectedLeave(null);
      loadLeaves(false);
    } catch (error: any) {
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail || 'Failed to update leave status'));
    } finally {
      setActionLoading(false);
    }
  };

  const filteredLeaves = leaves.filter(leave => filter === 'ALL' || leave.status === filter);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        <StandardPageHeader
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          title="Leave Approvals"
          subtitle={`${leaves.length} total requests • ${stats.pending} pending`}
          onBackPress={() => safeGoBack(navigation, 'PrincipalDashboard')}
        />

        <View style={styles.pageBody}>
          <View style={styles.filterTabs}>
            <AppText style={styles.filterLabel} weight="semibold">Filter by Status</AppText>
            <TeacherLeaveFilterTabs filter={filter} onFilterChange={setFilter} />
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ScreenSkeleton variant="list" />
            </View>
          ) : filteredLeaves.length > 0 ? (
            <View style={styles.leavesList}>
              {filteredLeaves.map(leave => (
                <TeacherLeaveCard key={leave.leave_id} leave={leave} onPress={setSelectedLeave} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <FileText size={64} color={C.border} />
              <AppText style={styles.emptyText}>No {filter.toLowerCase()} leave requests found</AppText>
            </View>
          )}
        </View>
      </ScrollView>

      <TeacherLeaveDetailModal
        leave={selectedLeave}
        actionLoading={actionLoading}
        onClose={() => setSelectedLeave(null)}
        onStatusUpdate={handleStatusUpdate}
      />
    </View>
  );
}
